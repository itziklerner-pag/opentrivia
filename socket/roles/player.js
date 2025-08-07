import convertTimeToPoint from "../utils/convertTimeToPoint.js"
import { abortCooldown } from "../utils/cooldown.js"
import { inviteCodeValidator, usernameValidator } from "../validator.js"

const Player = {
  checkRoom: async (game, io, socket, roomId) => {
    console.log("CheckRoom request:", { roomId, gameRoom: game.room, socketId: socket.id })
    
    try {
      await inviteCodeValidator.validate(roomId)
      console.log("Room ID validation passed for:", roomId)
    } catch (error) {
      console.log("Room ID validation failed:", error.errors[0], "for roomId:", roomId)
      socket.emit("game:errorMessage", error.errors[0])
      return
    }

    if (!game.room || roomId !== game.room) {
      console.log("Room not found:", { requestedRoom: roomId, actualRoom: game.room })
      socket.emit("game:errorMessage", "Room not found")
      return
    }

    console.log("Room found successfully, emitting successRoom for:", roomId)
    socket.emit("game:successRoom", roomId)
  },

  join: async (game, io, socket, player) => {
    console.log("Player join attempt:", { username: player.username, room: player.room, socketId: socket.id })
    
    try {
      await usernameValidator.validate(player.username)
      console.log("Username validation passed for:", player.username)
    } catch (error) {
      console.log("Username validation failed:", error.errors[0], "for username:", player.username)
      socket.emit("game:errorMessage", error.errors[0])
      return
    }

    if (!game.room || player.room !== game.room) {
      console.log("Room mismatch:", { gameRoom: game.room, playerRoom: player.room })
      socket.emit("game:errorMessage", "Room not found")
      return
    }

    if (game.players.find((p) => p.username === player.username)) {
      console.log("Username already exists:", player.username)
      socket.emit("game:errorMessage", "Username already exists")
      return
    }

    if (game.started) {
      console.log("Game already started, rejecting join for:", player.username)
      socket.emit("game:errorMessage", "Game already started")
      return
    }

    console.log("New Player joining successfully:", player)

    socket.join(player.room)
    console.log("Player joined room:", player.room)

    let playerData = {
      username: player.username,
      room: player.room,
      id: socket.id,
      points: 0,
    }
    socket.to(player.room).emit("manager:newPlayer", { ...playerData })

    game.players.push(playerData)

    socket.emit("game:successJoin")
  },

  selectedAnswer: (game, io, socket, answerKey) => {
    const player = game.players.find((player) => player.id === socket.id)
    const question = game.questions[game.currentQuestion]

    if (!player) {
      return
    }

    if (game.playersAnswer.find((p) => p.id === socket.id)) {
      return
    }

    game.playersAnswer.push({
      id: socket.id,
      answer: answerKey,
      points: convertTimeToPoint(game.roundStartTime, question.time),
    })

    socket.emit("game:status", {
      name: "WAIT",
      data: { text: "Waiting for the players to answer" },
    })
    socket.to(game.room).emit("game:playerAnswer", game.playersAnswer.length)

    if (game.playersAnswer.length === game.players.length) {
      abortCooldown()
    }
  },
}

export default Player
