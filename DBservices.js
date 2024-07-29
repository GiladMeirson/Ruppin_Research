import sql from 'mssql';
//igroup193_35344	igroup193
// Configuration object
const config = {
    user: 'igroup193', // replace with your database username
    password: 'igroup193_35344', // replace with your database password
    server: 'media.ruppin.ac.il', // replace with your server name or IP address
    database: 'igroup193_test2', // replace with your database name
    options: {
        encrypt: true, // Use encryption if required
        trustServerCertificate: true // Change to true for local dev / self-signed certs
    }
};

// Connect to the database
async function connectToDatabase() {
    try {
        let pool = await sql.connect(config);
        console.log('Connected to the database');

        // Example query
        let result = await pool.request().query('select * from stam');
        console.log(result);

        // Close the connection
        sql.close();
    } catch (err) {
        console.error('Database connection failed:', err);
    }
}
async function executeSpInsertToExecution(questionObjects) {
    let pool;
    let transaction;
    try {
        pool = await sql.connect(config);
        console.log('Connected to the database');

        // Start a transaction
        transaction = new sql.Transaction(pool);
        await transaction.begin();

        const request = new sql.Request(transaction);

        // Process each object in the array
        for (const questionObject of questionObjects) {
            await request
                .input('batchID', sql.Int, questionObject.batchID)
                .input('QuestionID', sql.Int, questionObject.QuestionID)
                .input('AnswerID', sql.Int, questionObject.AnswerID)
                .input('AnswerIndex', sql.TinyInt, questionObject.AnswerIndex)
                .input('HumanRank', sql.Int, questionObject.HumanRank)
                .input('AiRank', sql.Int, questionObject.AiRank)
                .input('AiExplnation', sql.NVarChar(sql.MAX), questionObject.AiExplnation)
                .input('ModelName', sql.NVarChar(55), questionObject.modelName)
                .execute('sp_insertToExecution');

            console.log(`Stored procedure executed for QuestionID: ${questionObject.QuestionID}`);
            
            // Clear the inputs for the next iteration
            request.parameters = {};
        }

        // Commit the transaction
        await transaction.commit();
        console.log('All inserts committed successfully');

        // Close the connection
        await sql.close();
        
        return { success: true, message: 'All records inserted successfully' };
    } catch (err) {
        console.error('Database operation failed:', err);
        
        // If there's an error, roll back the transaction
        if (transaction) {
            await transaction.rollback();
            console.log('Transaction rolled back due to error');
        }
        
        // Make sure to close the connection even if there's an error
        if (pool) {
            await sql.close();
        }
        
        throw err;  // Re-throw the error for the caller to handle
    }
}
// Example usage:
// const questionObject = {
//     batchID: 1,
//     QuestionID: 100,
//     AnswerID: 200,
//     AnswerIndex: 1,
//     HumanRank: 5,
//     AiRank: 4,
//     AiExplnation: 'This is an AI explanation'
//    modelName: 'Gemini-1.5-flash'
// };

// executeSpInsertToExecution(questionObject)
//     .then(result => console.log('Operation completed:', result))
//     .catch(err => console.error('Error:', err));


export { executeSpInsertToExecution };
