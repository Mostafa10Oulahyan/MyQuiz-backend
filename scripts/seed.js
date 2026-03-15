const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function seedDB() {
    let connection;
    try {
        console.log('Reading questionsList from quiz.js...');
        const quizJsPath = path.join(__dirname, '../../src/scripts/quiz.js');
        const fileContent = fs.readFileSync(quizJsPath, 'utf8');

        // Extract the array using regex or eval
        // Because of the markdown strings, using eval inside a controlled function is safe enough here.
        const match = fileContent.match(/const questionsList\s*=\s*(\[[\s\S]*?\])\s*let question/);
        
        if (!match) {
            throw new Error('Could not find questionsList in quiz.js');
        }

        // We'll clean up the ending comma just in case
        let arrayStr = match[1].trim();
        if (arrayStr.endsWith(';')) arrayStr = arrayStr.slice(0, -1);
        if (arrayStr.endsWith(',')) {
            const lastIndex = arrayStr.lastIndexOf(',');
            arrayStr = arrayStr.substring(0, lastIndex) + arrayStr.substring(lastIndex + 1);
        }

        // Eval the array string
        const questionsList = eval(arrayStr);

        console.log(`Found ${questionsList.length} categories to seed.`);

        console.log('Connecting to MySQL...');
        connection = await mysql.createConnection({
            host: process.env.DB_HOST || '127.0.0.1',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'quiz_db'
        });

        const categories = ['js', 'html', 'css', 'react', 'bootstrap'];

        for (let i = 0; i < questionsList.length; i++) {
            const categoryName = categories[i];
            const [catRows] = await connection.query('SELECT id FROM categories WHERE name = ?', [categoryName]);
            
            if (catRows.length > 0) {
                const categoryId = catRows[0].id;
                
                // Clear existing questions for this category to avoid duplicates when running multiple times
                await connection.query('DELETE FROM questions WHERE category_id = ?', [categoryId]);

                let questionCount = 0;
                for (let q of questionsList[i]) {
                    const [qResult] = await connection.query(
                        'INSERT INTO questions (category_id, question_text, correct_answer, hint) VALUES (?, ?, ?, ?)',
                        [categoryId, q.ques, q.correctAnswer, q.hint]
                    );

                    const questionId = qResult.insertId;

                    for (let c of q.choises) {
                        await connection.query(
                            'INSERT INTO choices (question_id, choice_text) VALUES (?, ?)',
                            [questionId, c]
                        );
                    }
                    questionCount++;
                }
                console.log(`Seeded ${questionCount} questions for category '${categoryName}'.`);
            }
        }
        console.log('Seed completed successfully!');
    } catch (error) {
        console.error('Error seeding DB:', error);
    } finally {
        if (connection) await connection.end();
        process.exit();
    }
}
seedDB();
