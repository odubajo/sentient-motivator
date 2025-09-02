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

app.post('/motivate', async (req, res) => {
    const { feeling, responseType } = req.body;
    const apiKey = process.env.API_KEY;

    console.log('API Key exists:', !!apiKey);
    console.log('Request body:', { feeling, responseType });

    if (!apiKey) {
        console.error('API key not found in environment variables');
        return res.status(500).json({ error: 'API key not found.' });
    }

    if (!feeling || !responseType) {
        return res.status(400).json({ error: 'Feeling and response type are required.' });
    }

    const systemPrompt = `You are a compassionate and motivational assistant. The user is feeling a certain way and has requested a specific type of support. Your response should be concise, directly address their feeling, and provide the requested support. The support type is: "${responseType}".`;

    const requestPayload = {
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
        max_tokens: 200
    };

    console.log('Making request to Fireworks API...');

    try {
        const response = await axios.post(
            'https://api.fireworks.ai/inference/v1/chat/completions',
            requestPayload,
            {
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                },
                timeout: 30000 // 30 second timeout
            }
        );

        console.log('API Response status:', response.status);
        console.log('API Response data:', response.data);

        if (!response.data.choices || !response.data.choices[0] || !response.data.choices[0].message) {
            console.error('Unexpected API response structure:', response.data);
            return res.status(500).json({ 
                error: 'Unexpected response from AI service.' 
            });
        }

        const motivation = response.data.choices[0].message.content;
        res.json({ motivation });

    } catch (error) {
        console.error('Full error object:', error);
        console.error('Error response:', error.response?.data);
        console.error('Error status:', error.response?.status);
        console.error('Error message:', error.message);

        // More specific error messages
        if (error.response) {
            // The request was made and the server responded with a status code
            const status = error.response.status;
            const errorData = error.response.data;
            
            if (status === 401) {
                return res.status(500).json({ 
                    error: 'Authentication failed. Please check your API key.' 
                });
            } else if (status === 403) {
                return res.status(500).json({ 
                    error: 'Access forbidden. Please check your API permissions.' 
                });
            } else if (status === 429) {
                return res.status(500).json({ 
                    error: 'Rate limit exceeded. Please try again later.' 
                });
            } else if (status === 404) {
                return res.status(500).json({ 
                    error: 'AI model not found. The model may be unavailable.' 
                });
            } else {
                return res.status(500).json({ 
                    error: `API error (${status}): ${errorData?.error || 'Unknown error'}` 
                });
            }
        } else if (error.request) {
            // The request was made but no response was received
            console.error('No response received:', error.request);
            return res.status(500).json({ 
                error: 'No response from AI service. Please try again.' 
            });
        } else {
            // Something happened in setting up the request
            return res.status(500).json({ 
                error: `Request setup error: ${error.message}` 
            });
        }
    }
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        hasApiKey: !!process.env.API_KEY
    });
});

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
    console.log('Environment check:');
    console.log('- API_KEY exists:', !!process.env.API_KEY);
    console.log('- NODE_ENV:', process.env.NODE_ENV);
});
