import "server-only";

import { connect } from "node:tls";

type SendGmailMessageInput = {
  html: string;
  subject: string;
  to: string;
};

function readLine(socket: ReturnType<typeof connect>) {
  return new Promise<string>((resolve, reject) => {
    let buffer = "";
    const onData = (chunk: Buffer) => {
      buffer += chunk.toString("utf8");
      if (/\r\n$/.test(buffer)) {
        socket.off("data", onData);
        resolve(buffer);
      }
    };
    socket.on("data", onData);
    socket.once("error", reject);
  });
}

async function command(socket: ReturnType<typeof connect>, value: string, expected: number[]) {
  socket.write(`${value}\r\n`);
  const response = await readLine(socket);
  const code = Number(response.slice(0, 3));
  if (!expected.includes(code)) {
    throw new Error(`SMTP command failed: ${response.trim()}`);
  }
  return response;
}

function encodeHeader(value: string) {
  return `=?UTF-8?B?${Buffer.from(value, "utf8").toString("base64")}?=`;
}

function buildMessage({ from, html, subject, to }: SendGmailMessageInput & { from: string }) {
  const headers = [
    `From: ${from}`,
    `To: ${to}`,
    `Subject: ${encodeHeader(subject)}`,
    "MIME-Version: 1.0",
    "Content-Type: text/html; charset=UTF-8",
  ];

  return `${headers.join("\r\n")}\r\n\r\n${html}\r\n.`;
}

export async function sendGmailMessage(input: SendGmailMessageInput) {
  const user = process.env.GMAIL_SMTP_USER;
  const password = process.env.GMAIL_SMTP_APP_PASSWORD;
  const from = process.env.EMAIL_FROM || user;

  if (!user || !password || !from) {
    throw new Error("GMAIL_SMTP_USER, GMAIL_SMTP_APP_PASSWORD, and EMAIL_FROM are required.");
  }

  const socket = connect({ host: "smtp.gmail.com", port: 465, servername: "smtp.gmail.com" });

  await new Promise<void>((resolve, reject) => {
    socket.once("secureConnect", resolve);
    socket.once("error", reject);
  });

  try {
    await readLine(socket);
    await command(socket, "EHLO byte-earn.local", [250]);
    await command(socket, "AUTH LOGIN", [334]);
    await command(socket, Buffer.from(user).toString("base64"), [334]);
    await command(socket, Buffer.from(password).toString("base64"), [235]);
    await command(socket, `MAIL FROM:<${from}>`, [250]);
    await command(socket, `RCPT TO:<${input.to}>`, [250, 251]);
    await command(socket, "DATA", [354]);
    await command(socket, buildMessage({ ...input, from }), [250]);
    await command(socket, "QUIT", [221]);
  } finally {
    socket.destroy();
  }
}
