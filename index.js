const express = require('express');
const axios = require('axios');
const bodyParser = require('body-parser');
require('dotenv').config();

const app = express();
app.use(bodyParser.json());

app.post('/webhook', async (req, res) => {
  const events = req.body.events;
  if (!Array.isArray(events)) {
    return res.status(500).send('Invalid webhook format');
  }

  for (const event of events) {
    if (event.type === 'message' && event.message.type === 'text') {
      const userMessage = event.message.text;

      // OpenAIへのプロンプト構成（らく～ま仕様）
      const systemPrompt = `あなたはプロのEC運営の専門家として、「らく～ま」です。
EC運営を悩める初心者に優しくメッージを作成してください。
語尾は「だよ！」や、「なんだ！」のように明るく。
また、「らくッス」に関する質問以外はすべて絶対に答えないでください。
関係ない質問には「ごめんね、らくッスのこと以外はお答えできないんだ〜！」と返してください。`;

      const messages = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage }
      ];

      try {
        const completion = await axios.post('https://api.openai.com/v1/chat/completions', {
          model: 'gpt-4',
          messages: messages
        }, {
          headers: {
            Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
            'Content-Type': 'application/json'
          }
        });

        const replyMessage = completion.data.choices[0].message.content;

        // LINEへの返信
        await axios.post('https://api.line.me/v2/bot/message/reply', {
          replyToken: event.replyToken,
          messages: [{ type: 'text', text: replyMessage }]
        }, {
          headers: {
            Authorization: `Bearer ${process.env.LINE_TOKEN}`,
            'Content-Type': 'application/json'
          }
        });
      } catch (err) {
        console.error('Error handling event:', err.response?.data || err.message);
      }
    }
  }

  res.status(200).send('OK');
});

app.get('/', (req, res) => {
  res.send('らく～ま Bot is running!');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
