const mysql = require('mysql2/promise');
require('dotenv').config();

// ──────────────────────────────────────────────────────────────
// SEED.JS — Populates the database with initial data
// ──────────────────────────────────────────────────────────────
// What this file does:
//   1. Inserts all 12 categories (with icons, colors, groups)
//   2. Inserts sample questions for each category
//
// Run AFTER initDB.js:
//   node scripts/initDB.js && node scripts/seed.js
// ──────────────────────────────────────────────────────────────

const CATEGORIES = [
    // ── Frontend ──
    { name: 'html',       display_name: 'HTML5',      group_name: 'frontend',  icon: 'fa-brands fa-html5',     color: '#e34f26', description: 'Maîtrisez le HTML sémantique, l\'accessibilité et les pratiques modernes de balisage.',     order: 1 },
    { name: 'css',        display_name: 'CSS3',       group_name: 'frontend',  icon: 'fa-brands fa-css3-alt',  color: '#1572b6', description: 'Apprenez les techniques CSS avancées, les animations et le design responsive.',             order: 2 },
    { name: 'javascript', display_name: 'JavaScript', group_name: 'frontend',  icon: 'fa-brands fa-js',        color: '#f7df1e', description: 'Plongez dans le JavaScript moderne, ES6+ et la manipulation du DOM.',                      order: 3 },
    { name: 'react',      display_name: 'React',      group_name: 'frontend',  icon: 'fa-brands fa-react',     color: '#61dafb', description: 'Construisez des applications web modernes avec React et son écosystème.',                   order: 4 },
    { name: 'bootstrap',  display_name: 'Bootstrap',  group_name: 'frontend',  icon: 'fa-brands fa-bootstrap', color: '#7952b3', description: 'Apprenez à créer des sites web responsifs avec le framework Bootstrap.',                    order: 5 },
    // ── Backend ──
    { name: 'python',     display_name: 'Python',     group_name: 'backend',   icon: 'fa-brands fa-python',    color: '#3776ab', description: 'Apprenez Python : syntaxe, structures de données, POO et scripting.',                      order: 6 },
    { name: 'java',       display_name: 'Java',       group_name: 'backend',   icon: 'fa-brands fa-java',      color: '#007396', description: 'Maîtrisez Java : POO, collections, multithreading et design patterns.',                     order: 7 },
    { name: 'nodejs',     display_name: 'Node.js',    group_name: 'backend',   icon: 'fa-brands fa-node-js',   color: '#339933', description: 'Développez des serveurs performants avec Node.js, Express et les API REST.',               order: 8 },
    { name: 'php',        display_name: 'PHP',        group_name: 'backend',   icon: 'fa-brands fa-php',       color: '#777bb4', description: 'Apprenez le PHP moderne : syntaxe, PDO, sessions et sécurité web.',                         order: 9 },
    // ── Framework ──
    { name: 'laravel',    display_name: 'Laravel',    group_name: 'framework', icon: 'fa-brands fa-laravel',   color: '#ff2d20', description: 'Maîtrisez Laravel : Eloquent ORM, migrations, middleware et Blade templates.',              order: 10 },
    // ── Database ──
    { name: 'mysql',      display_name: 'MySQL',      group_name: 'database',  icon: 'fa-solid fa-database',   color: '#4479a1', description: 'Apprenez SQL, les jointures, l\'indexation et l\'optimisation des requêtes.',               order: 11 },
    { name: 'mongodb',    display_name: 'MongoDB',    group_name: 'database',  icon: 'fa-solid fa-leaf',       color: '#47a248', description: 'Maîtrisez MongoDB : documents, agrégation, indexation et Mongoose.',                        order: 12 },
];

// ──────────────────────────────────────────────────────────────
// Sample questions per category (add more as needed!)
// Format: { ques, correctAnswer, hint, difficulty, choices[] }
// ──────────────────────────────────────────────────────────────
const SAMPLE_QUESTIONS = {
    python: [
        {
            ques: 'Quel mot-clé est utilisé pour définir une fonction en Python ?',
            correctAnswer: 'def',
            hint: 'C\'est un mot de 3 lettres.',
            difficulty: 'easy',
            choices: ['def', 'function', 'func']
        },
        {
            ques: 'Quel est le résultat de `type([])` en Python ?',
            correctAnswer: "<class 'list'>",
            hint: 'Les crochets [] créent ce type de structure.',
            difficulty: 'easy',
            choices: ["<class 'list'>", "<class 'array'>", "<class 'tuple'>"]
        },
        {
            ques: 'Comment créer un dictionnaire vide en Python ?',
            correctAnswer: '{}',
            hint: 'Utilisez les accolades.',
            difficulty: 'easy',
            choices: ['{}', '[]', 'dict[]']
        },
    ],
    java: [
        {
            ques: 'Quel est le point d\'entrée d\'un programme Java ?',
            correctAnswer: 'public static void main(String[] args)',
            hint: 'C\'est une méthode statique publique.',
            difficulty: 'easy',
            choices: ['public static void main(String[] args)', 'void start()', 'public void run()']
        },
        {
            ques: 'Quel mot-clé Java est utilisé pour l\'héritage ?',
            correctAnswer: 'extends',
            hint: 'Ce mot signifie "étendre" en anglais.',
            difficulty: 'easy',
            choices: ['extends', 'inherits', 'implements']
        },
        {
            ques: 'Quel est le type wrapper pour int en Java ?',
            correctAnswer: 'Integer',
            hint: 'C\'est le nom complet du type primitif.',
            difficulty: 'medium',
            choices: ['Integer', 'Int', 'Number']
        },
    ],
    nodejs: [
        {
            ques: 'Quelle méthode Express est utilisée pour gérer les requêtes GET ?',
            correctAnswer: 'app.get()',
            hint: 'Le nom de la méthode HTTP en minuscules.',
            difficulty: 'easy',
            choices: ['app.get()', 'app.fetch()', 'app.read()']
        },
        {
            ques: 'Quel module Node.js est utilisé pour créer un serveur HTTP ?',
            correctAnswer: 'http',
            hint: 'C\'est le nom du protocole lui-même.',
            difficulty: 'easy',
            choices: ['http', 'server', 'net']
        },
        {
            ques: 'Que retourne `require()` en Node.js ?',
            correctAnswer: 'module.exports du fichier importé',
            hint: 'C\'est ce que le module exporte.',
            difficulty: 'medium',
            choices: ['module.exports du fichier importé', 'Le contenu du fichier en texte', 'Un objet Buffer']
        },
    ],
    php: [
        {
            ques: 'Comment déclarer une variable en PHP ?',
            correctAnswer: '$variable',
            hint: 'Ça commence par un symbole monétaire.',
            difficulty: 'easy',
            choices: ['$variable', 'var variable', 'let variable']
        },
        {
            ques: 'Quelle fonction PHP affiche du texte ?',
            correctAnswer: 'echo',
            hint: 'C\'est aussi un terme qui signifie "répéter un son".',
            difficulty: 'easy',
            choices: ['echo', 'print_text', 'display']
        },
        {
            ques: 'Comment connecter PHP à une base de données MySQL de manière sécurisée ?',
            correctAnswer: 'PDO',
            hint: 'C\'est un acronyme de 3 lettres (PHP Data ...).',
            difficulty: 'medium',
            choices: ['PDO', 'mysql_connect', 'mysqli_only']
        },
    ],
    laravel: [
        {
            ques: 'Quel ORM est intégré dans Laravel ?',
            correctAnswer: 'Eloquent',
            hint: 'Un mot qui signifie "éloquent" en français.',
            difficulty: 'easy',
            choices: ['Eloquent', 'Doctrine', 'Hibernate']
        },
        {
            ques: 'Quelle commande crée un nouveau contrôleur en Laravel ?',
            correctAnswer: 'php artisan make:controller',
            hint: 'C\'est une commande artisan.',
            difficulty: 'easy',
            choices: ['php artisan make:controller', 'laravel create controller', 'composer make:controller']
        },
        {
            ques: 'Quel moteur de template utilise Laravel ?',
            correctAnswer: 'Blade',
            hint: 'C\'est un mot qui signifie "lame" en anglais.',
            difficulty: 'easy',
            choices: ['Blade', 'Twig', 'Mustache']
        },
    ],
    mysql: [
        {
            ques: 'Quelle commande SQL est utilisée pour récupérer des données ?',
            correctAnswer: 'SELECT',
            hint: 'C\'est le mot anglais pour "sélectionner".',
            difficulty: 'easy',
            choices: ['SELECT', 'GET', 'FETCH']
        },
        {
            ques: 'Quel mot-clé SQL est utilisé pour joindre deux tables ?',
            correctAnswer: 'JOIN',
            hint: 'C\'est le mot anglais pour "joindre".',
            difficulty: 'easy',
            choices: ['JOIN', 'MERGE', 'COMBINE']
        },
        {
            ques: 'Quelle clause SQL filtre les résultats après un GROUP BY ?',
            correctAnswer: 'HAVING',
            hint: 'Ce n\'est pas WHERE — c\'est utilisé après les agrégations.',
            difficulty: 'medium',
            choices: ['HAVING', 'WHERE', 'FILTER']
        },
    ],
    mongodb: [
        {
            ques: 'Quel format de données MongoDB utilise-t-il pour stocker les documents ?',
            correctAnswer: 'BSON',
            hint: 'C\'est du JSON en format binaire.',
            difficulty: 'easy',
            choices: ['BSON', 'XML', 'CSV']
        },
        {
            ques: 'Quelle méthode MongoDB est utilisée pour insérer un document ?',
            correctAnswer: 'insertOne()',
            hint: 'Insert + One.',
            difficulty: 'easy',
            choices: ['insertOne()', 'add()', 'create()']
        },
        {
            ques: 'Quel framework ODM est couramment utilisé avec MongoDB et Node.js ?',
            correctAnswer: 'Mongoose',
            hint: 'C\'est un animal 🐍 (une sorte de).',
            difficulty: 'easy',
            choices: ['Mongoose', 'Sequelize', 'Prisma']
        },
    ],
};


async function seedDB() {
    let connection;
    try {
        console.log('🔌 Connecting to MySQL...');
        connection = await mysql.createConnection({
            host: process.env.DB_HOST || '127.0.0.1',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'quiz_db'
        });

        // ─── 1. Seed Categories ───────────────────────
        console.log('\n📂 Seeding categories...');
        for (const cat of CATEGORIES) {
            await connection.query(`
                INSERT INTO categories (name, display_name, group_name, icon, color, description, display_order)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE 
                    display_name = VALUES(display_name),
                    group_name   = VALUES(group_name),
                    icon         = VALUES(icon),
                    color        = VALUES(color),
                    description  = VALUES(description),
                    display_order = VALUES(display_order)
            `, [cat.name, cat.display_name, cat.group_name, cat.icon, cat.color, cat.description, cat.order]);
            console.log(`  ✅ ${cat.display_name} (${cat.group_name})`);
        }

        // ─── 2. Seed Sample Questions for NEW categories ──
        console.log('\n📝 Seeding sample questions...');
        for (const [categoryName, questions] of Object.entries(SAMPLE_QUESTIONS)) {
            // Get category ID
            const [catRows] = await connection.query('SELECT id FROM categories WHERE name = ?', [categoryName]);
            if (catRows.length === 0) {
                console.warn(`  ⚠️  Category "${categoryName}" not found, skipping...`);
                continue;
            }
            const categoryId = catRows[0].id;

            // Clear existing questions for this category (to avoid duplicates on re-run)
            await connection.query('DELETE FROM questions WHERE category_id = ?', [categoryId]);

            let count = 0;
            for (const q of questions) {
                // Insert question
                const [qResult] = await connection.query(
                    'INSERT INTO questions (category_id, question_text, correct_answer, hint, difficulty) VALUES (?, ?, ?, ?, ?)',
                    [categoryId, q.ques, q.correctAnswer, q.hint, q.difficulty || 'medium']
                );
                const questionId = qResult.insertId;

                // Insert choices
                for (const choiceText of q.choices) {
                    const isCorrect = choiceText === q.correctAnswer ? 1 : 0;
                    await connection.query(
                        'INSERT INTO choices (question_id, choice_text, is_correct) VALUES (?, ?, ?)',
                        [questionId, choiceText, isCorrect]
                    );
                }
                count++;
            }
            console.log(`  ✅ ${count} questions seeded for "${categoryName}"`);
        }

        console.log('\n🎉 Seed completed successfully!');
    } catch (error) {
        console.error('❌ Error seeding DB:', error);
    } finally {
        if (connection) await connection.end();
        process.exit();
    }
}

seedDB();
