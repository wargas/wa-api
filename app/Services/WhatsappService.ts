import {
  WASocket,
  useMultiFileAuthState,
  makeWASocket,
  Browsers,
  WAConnectionState,
} from "@whiskeysockets/baileys";
import { pino } from "pino";
import { makeMysqlStore } from "./makeMysqlStore";
import Logger from '@ioc:Adonis/Core/Logger'
import Env from '@ioc:Adonis/Core/Env'

class WhatsappService {
  sock: WASocket;
  prefix: string;
  state: WAConnectionState;
  qrcode = "";

  constructor(prefix: string) {
    this.prefix = prefix;
    this.state = "close";
  }

  async connect() {
    const logger = pino({}).child({});
    Logger.info("iniciando whatsapp...");

    const { state, saveCreds } = await useMultiFileAuthState(
      this.getAuthFileName()
    );
    logger.level = "fatal";
    this.sock = makeWASocket({
      version: [2, 2321, 88],
      auth: state,
      printQRInTerminal: true,
      logger,
      browser: Browsers.macOS("Desktop"),
      //   syncFullHistory: true,
    });

    

    this.sock.ev.on("connection.update", async (state) => {
      if (state.lastDisconnect?.error?.message.startsWith("Stream Errored")) {
        Logger.error("Erro ao connectar")
        await this.connect();
      }
      if (state.connection) {
        this.state = state.connection;
        Logger.info(state.connection)
      }

      if(state.qr) {
        this.qrcode = state.qr;
      } else {
        this.qrcode = ""
      }
    });

    this.sock.ev.on("creds.update", saveCreds);
    const store = makeMysqlStore();
    store.bind(this.sock.ev);
  }

  getAuthFileName(): string {
    return `storage/auth-info-${this.prefix}`;
  }

}


export default new WhatsappService(Env.get("WA_KEY"));