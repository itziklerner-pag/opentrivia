export default function handler(req, res) {
  res.json({
    hasAppId: !!process.env.PUSHER_APP_ID,
    hasKey: !!process.env.PUSHER_KEY,
    hasSecret: !!process.env.PUSHER_SECRET,
    hasCluster: !!process.env.PUSHER_CLUSTER,
    appId: process.env.PUSHER_APP_ID?.substring(0, 3) + '***',
    key: process.env.PUSHER_KEY?.substring(0, 8) + '***',
    cluster: process.env.PUSHER_CLUSTER,
    nodeEnv: process.env.NODE_ENV
  })
}