const https = require('https')
const fs    = require('fs')
const next  = require('next')

const app    = next({ dev: false })
const handle = app.getRequestHandler()

const options = {
  key:  fs.readFileSync('./certs/homebox.tail7f8e60.ts.net.key'),
  cert: fs.readFileSync('./certs/homebox.tail7f8e60.ts.net.crt'),
}

app.prepare().then(() => {
  https.createServer(options, (req, res) => handle(req, res))
    .listen(8443, () => {
      console.log('✔ neron-vocal HTTPS → https://homebox.tail7f8e60.ts.net:8443')
    })
})
