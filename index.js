import xterm from '@xterm/xterm'
const { Terminal } = xterm;
import { SerializeAddon } from "@xterm/addon-serialize";
import { spawn } from 'node-pty'
import { WebSocketServer } from 'ws';

// Setup websocket
const wss = new WebSocketServer({ port: 8080 });
wss.on('connection', function connection(ws)
{
    ws.on('error', console.error);

    ws.on('message', function message(data)
    {
        console.log('received: %s', data);
    });

});

// Create xterm.js instance
const COLS = 120;
const ROWS = 30;
const term = new Terminal({ cols: COLS, rows: ROWS, scrollback: 0 }); 
const serializeAddon = new SerializeAddon();
term.loadAddon(serializeAddon)
const btopProcess = spawn("btop", ["-u", "1000"], {
    name: "xterm-color",
    cols: COLS,
    rows: ROWS,
    cwd: process.cwd(),
    env: process.env,
    scrollback: 0
});

btopProcess.on("data", (data) =>
{
    term.write(data); // Pipe process output to xterm.js

    let serializedData = serializeAddon.serializeAsHTML({ scrollback: 0 })

    var result = serializedData.substring("<html><body><!--StartFragment--><pre><div style='color: #000000; background-color: #ffffff; font-family: courier-new, courier, monospace; font-size: 15px;'>".length, serializedData.length - "</pre><!--EndFragment--></body></html>".length)

    // Trim unnecessary spans
    result = result.replaceAll("<span></span>", "")
    result = result.replaceAll("<div>", "")
    result = result.replaceAll("</div>", "\n")

    // Convert color codes
    result = result.replaceAll(/<span style='color: (#[0-9a-fA-F]{6}); background-color: (#[0-9a-fA-F]{6});(?: font-weight: (\w+);)?'>/g, (match, color, background, weight) => `<color ${color}><mark ${background}>${weight ? "<b>" : ""}`)
    result = result.replaceAll(/<span style='background-color: (#[0-9a-fA-F]{6});'>/g, (match, background) => `<mark ${background}>`)
    result = result.replaceAll("</span>", "<i></closeall>")
    result = result.replaceAll("<span>", "")

    // Send the string to each client
    wss.clients.forEach(client =>
    {
        if (client.readyState == WebSocket.OPEN)
        {
            client.send(result)
        }
    })

    console.log("Data sent.")
});