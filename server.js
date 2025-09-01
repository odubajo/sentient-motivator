const express = require('express');
const axios = require('axios');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config();

const app = express();
const port = 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname)));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.post('/motivate', async (req, res) => {
    const { feeling, responseType } = req.body;
    const apiKey = process.env.API_KEY;

    if (!apiKey) {
        return res.status(500).json({ error: 'API key not found.' });
    }

    if (!feeling || !responseType) {
        return res.status(400).json({ error: 'Feeling and response type are required.' });
    }

    const systemPrompt = `You are a compassionate and motivational assistant. The user is feeling a certain way and has requested a specific type of support. Your response should be concise, directly address their feeling, and provide the requested support. The support type is: "${responseType}".`;

    try {
        const response = await axios.post(
            'https://api.fireworks.ai/inference/v1/chat/completions', 
            {
                model: 'accounts/sentientfoundation-serverless/models/dobby-mini-unhinged-plus-llama-3-1-8b', 
                messages: [
                    {
                        role: 'system',
                        content: systemPrompt
                    },
                    {
                        role: 'user',
                        content: feeling
                    }
                ],
                temperature: 0.7,
            },
            {
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        const motivationalMessage = response.data.choices[0]?.message?.content;
        res.json({ motivation: motivationalMessage });

    } catch (error) {
        console.error('Error calling AI API:', error.response ? error.response.data : error.message);
        res.status(500).json({ error: 'Failed to get a motivational response.' });
    }
});

module.exports = app;
