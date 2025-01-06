"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.notifier = void 0;
const express_1 = __importDefault(require("express"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const YouTubeNotifier = require('youtube-notification');
const app = (0, express_1.default)();
const port = process.env.PORT;
const baseUrl = "https://strong-yak-75.loca.lt";
let channelId = process.env.CHANNEL_ID;
exports.notifier = new YouTubeNotifier({
    hubCallback: `${baseUrl}/youtube/notifications`,
});
app.use("/youtube/notifications", exports.notifier.listener());
app.listen(port, () => {
    console.log(`App listening at http://localhost:${port}`);
});
exports.notifier.subscribe(channelId);
exports.notifier.on('subscribe', (data) => {
    console.log('Subscribed');
    console.log(data);
});
exports.notifier.on('notified', (data) => {
    console.log('New Video');
    console.log(data);
});
