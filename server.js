const express = require('express');
const { CosmosClient } = require('@azure/cosmos');
const cors = require('cors');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

// Cosmos DB Configuration
const endpoint = process.env.COSMOS_DB_ENDPOINT;
const key = process.env.COSMOS_DB_KEY;
const databaseId = 'ProducDB'; // Correct this if needed
const containerId = 'Products';

if (!endpoint || !key) {
    console.error('Missing Cosmos DB endpoint or key in .env file');
    process.exit(1);
}

const client = new CosmosClient({ endpoint, key });
const container = client.database(databaseId).container(containerId);

// Middleware for JSON, CORS, and serving static files
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());
app.use(express.static('public'));

// Ensure Database and Container Exist
async function ensureDatabaseSetup() {
    try {
        const { database } = await client.databases.createIfNotExists({ id: databaseId });
        const { container } = await database.containers.createIfNotExists({
            id: containerId,
            partitionKey: { paths: ["/id"] }
        });
        console.log(`Database and container ensured.`);
    } catch (error) {
        console.error(`Error setting up database: ${error.message}`);
    }
}
ensureDatabaseSetup().catch(err => console.error(err));

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
