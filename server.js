const express = require('express');
const { CosmosClient } = require('@azure/cosmos');
require('dotenv').config();

const app = express();
const port = 3000;

// Cosmos DB Configuration
const endpoint = process.env.COSMOS_DB_ENDPOINT;
const key = process.env.COSMOS_DB_KEY;
const databaseId = 'ProductDB';
const containerId = 'Products';

const client = new CosmosClient({ endpoint, key });
const container = client.database(databaseId).container(containerId);

// Middleware for JSON and serving static files
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// Add new product
app.post('/add-product', async (req, res) => {
    const { id, name, price, description } = req.body;
    try {
        const { resource: createdItem } = await container.items.create({ id, name, price, description });
        res.redirect('/');
    } catch (error) {
        res.status(500).send(`Error adding product: ${error.message}`);
    }
});

// List all products
app.get('/products', async (req, res) => {
    try {
        const { resources } = await container.items.readAll().fetchAll();
        res.json(resources);
    } catch (error) {
        res.status(500).send(`Error fetching products: ${error.message}`);
    }
});

// Search products
app.get('/search', async (req, res) => {
    const query = req.query.q;
    try {
        const querySpec = {
            query: 'SELECT * FROM c WHERE CONTAINS(c.name, @query)',
            parameters: [{ name: '@query', value: query }]
        };
        const { resources } = await container.items.query(querySpec).fetchAll();
        res.json(resources);
    } catch (error) {
        res.status(500).send(`Error searching products: ${error.message}`);
    }
});

app.listen(port, () => console.log(`Server running at http://localhost:${port}`));
