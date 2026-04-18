// Vercel Serverless Function - Currency API Proxy
// Fetches exchange rates from Frankfurter API on the server side

const API_URL = 'https://api.frankfurter.app';

module.exports = async (req, res) => {
    try {
        const response = await fetch(`${API_URL}/latest`);
        
        if (!response.ok) {
            throw new Error('Failed to fetch from Frankfurter API');
        }
        
        const data = await response.json();
        
        // Return CORS headers to allow browser access
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
        
        res.status(200).json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
