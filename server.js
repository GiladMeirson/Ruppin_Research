import express from 'express';
import bodyParser from 'body-parser';
import { AskGemini } from './gemini.js';
import { fileURLToPath } from 'url';
import path from 'path';
import cors from 'cors';

import { executeSpInsertToExecution } from './DBservices.js';



// Assuming the existing code is in the same file or imported here
// Import the run function and any other necessary components

const app = express();
const port = 3000;
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Middleware to parse JSON bodies
app.use(bodyParser.json());

// Use the cors middleware to allow access from any origin
app.use(cors());


// Serve static files from the 'public' directory
app.use(express.static('public'));

// POST route to receive a string and return a string using the run function
app.post('/AskAi', async (req, res) => {

  if (req.body.model =='gemini-1.5') {
    try {
      const inputText = req.body.text; // Assuming the input text is sent in the body with key 'text'
      if (!inputText) {
        return res.status(400).send('No text provided');
      }
      const result = await AskGemini(inputText); // Use the run function from the provided code
      res.json({ result });
  
    } catch (error) {
      console.error('Error processing string:', error);
      res.status(500).send('Internal Server Error');
    }
  }

 
});


// POST route to receive a question object and insert it into the database
app.post('/insertExecuation', async (req, res) => {
  try {
    const questionObject = req.body; // Assuming the question object is sent in the body
    if (!questionObject) {
      return res.status(400).send('No question object provided');
    }
    const result = await executeSpInsertToExecution(questionObject); // Use the provided function to insert the question object
    res.json({ result });

  } catch (error) {
    console.error('Error inserting question:', error);
    res.status(500).send('Internal Server Error');
  }
});


// Optionally, explicitly serve index.html for the root route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', '../pages/sendQuestion.html'));
});

// Start the server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});