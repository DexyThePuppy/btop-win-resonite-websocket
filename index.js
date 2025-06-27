import xterm from '@xterm/xterm'
const { Terminal } = xterm;
import { SerializeAddon } from "@xterm/addon-serialize";
import { spawn } from 'node-pty'
import fs from 'fs'
import stripAnsi from "strip-ansi"
import { WebSocketServer } from 'ws';

const wss = new WebSocketServer({ port: 8080 });

wss.on('connection', function connection(ws)
{
    ws.on('error', console.error);

    ws.on('message', function message(data)
    {
        console.log('received: %s', data);
    });

});

const COLS = 120;
const ROWS = 30;
const term = new Terminal({ cols: COLS, rows: ROWS, scrollback: 0 }); // Create xterm.js instance
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
    // console.clear();
    // console.log(getVirtualBuffer(term)); // Print the virtual screen

    let serializedData = serializeAddon.serializeAsHTML({ scrollback: 0 })

    var result = serializedData.substring("<html><body><!--StartFragment--><pre><div style='color: #000000; background-color: #ffffff; font-family: courier-new, courier, monospace; font-size: 15px;'>".length, serializedData.length - "</pre><!--EndFragment--></body></html>".length)

    // Trim unnecessary spans
    result = result.replaceAll("<span></span>", "")
    result = result.replaceAll("<div>", "")
    result = result.replaceAll("</div>", "\n")

    result = result.replaceAll(/<span style='color: (#[0-9a-fA-F]{6}); background-color: (#[0-9a-fA-F]{6});(?: font-weight: (\w+);)?'>/g, (match, color, background, weight) => `<color ${color}><mark ${background}>${weight ? "<b>" : ""}`)
    result = result.replaceAll(/<span style='background-color: (#[0-9a-fA-F]{6});'>/g, (match, background) => `<mark ${background}>`)
    result = result.replaceAll("</span>", "<i></closeall>")
    result = result.replaceAll("<span>", "")

    // Color codes
    // result = serializedData.replaceAll(/\x1b\[38;2;(\d{1,3});(\d{1,3});(\d{1,3})m/g, (match, r, g, b) => `<color #${parseInt(r, 10).toString(16)}${parseInt(g, 10).toString(16)}${parseInt(b, 10).toString(16)}>`)
    // result = result.replaceAll(/\x1b\[48;2;(\d{1,3});(\d{1,3});(\d{1,3})m/g, (match, r, g, b) => `<mark #${parseInt(r, 10).toString(16)}${parseInt(g, 10).toString(16)}${parseInt(b, 10).toString(16)}>`)
    // result = result.replaceAll(/\x1b\[0m/g, "</closeall>")
    // result = result.replaceAll(/\x1b\[22m/g, "</closeall>")
    // result = result.replaceAll(/\x1b\[1m/g, "<b>")
    // result = result.replaceAll(/\x1b\[3m/g, "<i>")

    // Cursor
    // result = result.replaceAll(/\x1b\[(\d+);(\d+)f/g, (match, n, m) => `\x1e\x1d${n};${m};`)
    // result = result.replaceAll(/\x1b\[(\d+)([A-D])/g, (match, n, direction) => `\x1e\x1d${n}${direction};`)

    // Remove private characters
    // result = result.replaceAll(/\x1b\[\?\d+\w/g, "")
    // result = result.replaceAll(/X\x1e\x1d\d+C;/g, "\n")
    // result = stripAnsi(result)

    // fs.writeFileSync("./stdout.log", result)

    wss.clients.forEach(client =>
    {
        if (client.readyState == WebSocket.OPEN)
        {
            // client.send(getVirtualBuffer(term).join("\n"))
            client.send(result)
        }
    })

    console.log("Write")
});

// Function to extract the screen buffer
function getVirtualBuffer(term)
{
    let buffer = term.buffer.active; // Get active buffer
    let output = [];

    for (let i = 0; i < term.rows; i++)
    {
        let line = buffer.getLine(i);
        output.push(line ? `line.translateToString()` : ' '.repeat(COLS));
    }

    return output; // Returns an array of strings representing rows
}