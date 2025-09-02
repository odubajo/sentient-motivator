const express = require('express');
const axios = require('axios');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname)));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        hasApiKey: !!process.env.API_KEY
    });
});

// Test endpoint to check available models
app.get('/test-models', async (req, res) => {
    const apiKey = process.env.API_KEY;
    
    if (!apiKey) {
        return res.status(500).json({ error: 'API key not found.' });
    }

    // Test with the most basic Fireworks model
    try {
        const response = await axios.post(
            'https://api.fireworks.ai/inference/v1/chat/completions',
            {
                model: 'accounts/fireworks/models/llama-v3p1-8b-instruct',
                messages: [
                    {
                        role: 'user',
                        content: 'Hello, please respond with just "API working"'
                    }
                ],
                max_tokens: 10
            },
            {
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                },
                timeout: 10000
            }
        );

        res.json({ 
            success: true,
            model: 'accounts/fireworks/models/llama-v3p1-8b-instruct',
            response: response.data.choices[0].message.content
        });

    } catch (error) {
        console.error('Model test failed:', error.response?.data);
        res.status(500).json({ 
            success: false,
            error: error.response?.data || error.message,
            status: error.response?.status
        });
    }
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

    // Use a standard Fireworks model instead of the custom one
    const model = 'accounts/fireworks/models/llama-v3p1-8b-instruct';
    
    const systemPrompt = `You are a compassionate and motivational assistant. The user is feeling a certain way and has requested a specific type of support. Your response should be concise, directly address their feeling, and provide the requested support. The support type is: "${responseType}".`;

    try {
        const response = await axios.post(
            'https://api.fireworks.ai/inference/v1/chat/completions',
            {
                model: model,
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
                max_tokens: 200
            },
            {
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                },
                timeout: 30000
            }
        );

        const motivation = response.data.choices[0].message.content;
        res.json({ motivation });

    } catch (error) {
        console.error('Full error:', error.response?.data || error.message);
        
        if (error.response?.status === 401) {
            return res.status(500).json({ 
                error: 'Invalid API key. Please check your Fireworks AI API key.' 
            });
        } else if (error.response?.status === 403) {
            return res.status(500).json({ 
                error: 'Access forbidden. Check your Fireworks AI account billing/credits.' 
            });
        } else if (error.response?.status === 429) {
            return res.status(500).json({ 
                error: 'Rate limit exceeded. Please try again later.' 
            });
        } else {
            return res.status(500).json({ 
                error: `API error: ${error.response?.data?.error || error.message}` 
            });
        }
    }
});

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
