const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
require('dotenv').config();

// ══════════════════════════════════════════════════════════════
// SEED.JS — Populates the database with initial data
// ══════════════════════════════════════════════════════════════
// Matches claudeDB.sql schema exactly.
// Run AFTER initDB.js:
//   node scripts/initDB.js && node scripts/seed.js
// ══════════════════════════════════════════════════════════════

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

// ══════════════════════════════════════════════════════════════
// Sample questions per category
// Format: { ques, correctAnswer, hint, hint_cost, difficulty, choices[] }
//   hint_cost: easy=5, medium=10, hard=20 (as per claudeDB.sql)
// ══════════════════════════════════════════════════════════════
const SAMPLE_QUESTIONS = {
    // ── FRONTEND ──
    html: [
        { ques: 'Que signifie l\'élément HTML <main> ?', correctAnswer: 'Le contenu principal du document', hint: 'Il ne doit y en avoir qu\'un seul par page.', hint_cost: 10, difficulty: 'easy', choices: ['Le contenu principal du document', 'L\'en-tête de la page', 'Le menu de navigation'] },
        { ques: 'Quel attribut améliore l\'accessibilité des images ?', correctAnswer: 'alt', hint: 'Il fournit un texte alternatif.', hint_cost: 10, difficulty: 'easy', choices: ['alt', 'title', 'src'] },
        { ques: 'Différence entre <section> et <article> ?', correctAnswer: '<article> est indépendant et réutilisable', hint: 'Pensez à un article de blog.', hint_cost: 10, difficulty: 'medium', choices: ['<article> est indépendant et réutilisable', '<section> est toujours plus grand', 'Aucune différence'] },
        { ques: 'Comment ouvrir un lien dans un nouvel onglet ?', correctAnswer: 'target="_blank"', hint: 'Cible = vide.', hint_cost: 10, difficulty: 'easy', choices: ['target="_blank"', 'rel="new"', 'href="new"'] },
        { ques: 'Quelle balise est utilisée pour inclure du JavaScript ?', correctAnswer: '<script>', hint: 'C\'est un script.', hint_cost: 10, difficulty: 'easy', choices: ['<script>', '<js>', '<javascript>'] },
        { ques: 'Quel élément définit le titre de la page dans l\'onglet ?', correctAnswer: '<title>', hint: 'Se trouve dans le <head>.', hint_cost: 10, difficulty: 'easy', choices: ['<title>', '<h1>', '<header>'] },
        { ques: 'Comment faire une liste numérotée ?', correctAnswer: '<ol>', hint: 'Ordered List.', hint_cost: 10, difficulty: 'easy', choices: ['<ol>', '<ul>', '<li>'] },
        { ques: 'Quelle balise crée un saut de ligne ?', correctAnswer: '<br>', hint: 'Break.', hint_cost: 10, difficulty: 'easy', choices: ['<br>', '<hr>', '<p>'] },
        { ques: 'Attribut pour lier un <label> à un <input> ?', correctAnswer: 'for', hint: 'for="id_input".', hint_cost: 10, difficulty: 'medium', choices: ['for', 'id', 'name'] },
        { ques: 'Quel type d\'input permet de choisir une couleur ?', correctAnswer: 'color', hint: 'type="..."', hint_cost: 10, difficulty: 'easy', choices: ['color', 'palette', 'hex'] }
    ],
    css: [
        { ques: 'Que fait "box-sizing: border-box" ?', correctAnswer: 'Inclut padding et border dans width/height', hint: 'Évite que les boîtes ne débordent.', hint_cost: 10, difficulty: 'medium', choices: ['Inclut padding et border dans width/height', 'Ajoute une bordure automatiquement', 'Supprime les marges'] },
        { ques: 'Comment centrer un élément Flexbox verticalement ?', correctAnswer: 'align-items: center', hint: 'Sur l\'axe transversal.', hint_cost: 10, difficulty: 'medium', choices: ['align-items: center', 'justify-content: center', 'text-align: center'] },
        { ques: 'Unité relative à la taille de police du parent ?', correctAnswer: 'em', hint: 'Différent de rem.', hint_cost: 10, difficulty: 'medium', choices: ['em', 'rem', 'px'] },
        { ques: 'Priorité la plus haute ?', correctAnswer: 'ID', hint: '#monId', hint_cost: 10, difficulty: 'easy', choices: ['ID', 'Classe', 'Balise'] },
        { ques: 'Propriété pour l\'espacement entre les lettres ?', correctAnswer: 'letter-spacing', hint: 'Letter + ...', hint_cost: 10, difficulty: 'easy', choices: ['letter-spacing', 'word-spacing', 'line-height'] },
        { ques: 'Comment cacher un élément tout en gardant son espace ?', correctAnswer: 'visibility: hidden', hint: 'Contraire de display: none.', hint_cost: 10, difficulty: 'medium', choices: ['visibility: hidden', 'display: none', 'opacity: 1'] },
        { ques: 'Z-index par défaut ?', correctAnswer: 'auto', hint: 'Pas un nombre.', hint_cost: 10, difficulty: 'easy', choices: ['auto', '0', '1'] },
        { ques: 'Sélecteur pour le survol de la souris ?', correctAnswer: ':hover', hint: 'Pseudo-classe.', hint_cost: 10, difficulty: 'easy', choices: [':hover', ':active', ':focus'] },
        { ques: 'Comment faire des coins arrondis ?', correctAnswer: 'border-radius', hint: 'Rayon de bordure.', hint_cost: 10, difficulty: 'easy', choices: ['border-radius', 'corner-style', 'box-round'] },
        { ques: 'Positionne l\'élément par rapport au viewport ?', correctAnswer: 'fixed', hint: 'Reste fixe au scroll.', hint_cost: 10, difficulty: 'medium', choices: ['fixed', 'absolute', 'relative'] }
    ],
    javascript: [
        { ques: 'Résultat de typeof null ?', correctAnswer: 'object', hint: 'C\'est un bug historique du JS.', hint_cost: 10, difficulty: 'medium', choices: ['object', 'null', 'undefined'] },
        { ques: 'Méthode pour transformer chaque élément d\'un tableau ?', correctAnswer: 'map()', hint: 'Crée un nouveau tableau avec les résultats.', hint_cost: 10, difficulty: 'medium', choices: ['map()', 'forEach()', 'filter()'] },
        { ques: 'Qu\'est-ce qu\'une Closure ?', correctAnswer: 'Une fonction avec accès à son scope parent', hint: 'Retient l\'environnement de création.', hint_cost: 20, difficulty: 'hard', choices: ['Une fonction avec accès à son scope parent', 'Un tableau fermé', 'Une erreur de syntaxe'] },
        { ques: 'Mot-clé pour une variable qui ne change pas ?', correctAnswer: 'const', hint: 'Constant.', hint_cost: 10, difficulty: 'easy', choices: ['const', 'let', 'var'] },
        { ques: 'Comment comparer valeur ET type ?', correctAnswer: '===', hint: 'Triple égal.', hint_cost: 10, difficulty: 'easy', choices: ['===', '==', '='] },
        { ques: 'Que retourne Array.isArray([]) ?', correctAnswer: 'true', hint: 'Teste si c\'est un tableau.', hint_cost: 10, difficulty: 'easy', choices: ['true', 'false', 'undefined'] },
        { ques: 'Variable déclarée sans valeur ?', correctAnswer: 'undefined', hint: 'Non définie.', hint_cost: 10, difficulty: 'easy', choices: ['undefined', 'null', 'NaN'] },
        { ques: 'Méthode pour ajouter en fin de tableau ?', correctAnswer: 'push()', hint: 'Pousser.', hint_cost: 10, difficulty: 'easy', choices: ['push()', 'pop()', 'shift()'] },
        { ques: 'Comment arrêter une boucle ?', correctAnswer: 'break', hint: 'Casser.', hint_cost: 10, difficulty: 'easy', choices: ['break', 'stop', 'exit'] },
        { ques: 'Résultat de Boolean("") ?', correctAnswer: 'false', hint: 'Chaîne vide.', hint_cost: 10, difficulty: 'medium', choices: ['false', 'true', 'undefined'] }
    ],
    react: [
        { ques: 'Rôle de useEffect ?', correctAnswer: 'Gérer les effets de bord', hint: 'Appels API, abonnements...', hint_cost: 10, difficulty: 'medium', choices: ['Gérer les effets de bord', 'Mettre à jour le style', 'Définir les routes'] },
        { ques: 'Le Virtual DOM sert à quoi ?', correctAnswer: 'Optimiser les mises à jour réelles du DOM', hint: 'Évite de tout re-rendre.', hint_cost: 15, difficulty: 'medium', choices: ['Optimiser les mises à jour réelles du DOM', 'Stocker les fichiers', 'Gérer la base de données'] },
        { ques: 'Peut-on modifier les props ?', correctAnswer: 'Non, elles sont immuables', hint: 'Viennent du parent.', hint_cost: 10, difficulty: 'medium', choices: ['Non, elles sont immuables', 'Oui, avec setState', 'Seulement dans les classes'] },
        { ques: 'Hook pour l\'état local ?', correctAnswer: 'useState', hint: 'Le plus utilisé.', hint_cost: 10, difficulty: 'easy', choices: ['useState', 'useEffect', 'useContext'] },
        { ques: 'Comment passer des données à un enfant ?', correctAnswer: 'Via les props', hint: 'Propriétés.', hint_cost: 10, difficulty: 'easy', choices: ['Via les props', 'Via le State', 'Via Redux uniquement'] },
        { ques: 'L\'extension de fichier recommandée pour React ?', correctAnswer: 'jsx / tsx', hint: 'JS + XML.', hint_cost: 10, difficulty: 'easy', choices: ['jsx / tsx', 'html', 'react'] },
        { ques: 'Qu\'est-ce qu\'un Fragment ?', correctAnswer: '<>...</> ou <React.Fragment>', hint: 'Évite de créer des div inutiles.', hint_cost: 10, difficulty: 'medium', choices: ['<>...</> ou <React.Fragment>', 'Un morceau de code mort', 'Un plugin externe'] },
        { ques: 'Pourquoi utiliser des "keys" ?', correctAnswer: 'Aider React à identifier les changements dans les listes', hint: 'ID unique.', hint_cost: 10, difficulty: 'medium', choices: ['Aider React à identifier les changements dans les listes', 'Pour le style CSS', 'Pour le référencement'] },
        { ques: 'Hook pour référencer un élément du DOM ?', correctAnswer: 'useRef', hint: 'Référence.', hint_cost: 15, difficulty: 'medium', choices: ['useRef', 'useDom', 'useLink'] },
        { ques: 'Comment gérer les événements ?', correctAnswer: 'onClick={handleClick}', hint: 'CamelCase.', hint_cost: 10, difficulty: 'easy', choices: ['onClick={handleClick}', 'onclick="click()"', 'on-click={...}'] }
    ],
    bootstrap: [
        { ques: 'Combien de colonnes dans la grille Bootstrap ?', correctAnswer: '12', hint: 'Un multiple de 2, 3, 4 et 6.', hint_cost: 10, difficulty: 'easy', choices: ['12', '10', '16'] },
        { ques: 'Classe pour un container qui prend toute la largeur ?', correctAnswer: 'container-fluid', hint: 'Fluide.', hint_cost: 10, difficulty: 'easy', choices: ['container-fluid', 'container-full', 'w-100'] },
        { ques: 'Classe pour centrer du texte ?', correctAnswer: 'text-center', hint: 'Text + Center.', hint_cost: 10, difficulty: 'easy', choices: ['text-center', 'align-center', 'center-text'] },
        { ques: 'Suffixe pour les écrans de taille moyenne ?', correctAnswer: 'md', hint: 'Medium.', hint_cost: 10, difficulty: 'easy', choices: ['md', 'sm', 'lg'] },
        { ques: 'Classe pour un bouton bleu ?', correctAnswer: 'btn-primary', hint: 'Bouton primaire.', hint_cost: 10, difficulty: 'easy', choices: ['btn-primary', 'btn-info', 'btn-blue'] },
        { ques: 'Comment espacer les éléments de la grille ?', correctAnswer: 'Gutter (g-*)', hint: 'Utilise la classe g.', hint_cost: 10, difficulty: 'medium', choices: ['Gutter (g-*)', 'Margin (m-*)', 'Padding (p-*)'] },
        { ques: 'Classe pour cacher sur mobile (sm) ?', correctAnswer: 'd-none d-sm-block', hint: 'Display none + display block sm.', hint_cost: 15, difficulty: 'medium', choices: ['d-none d-sm-block', 'hide-sm', 'sm-hidden'] },
        { ques: 'Lien vers la documentation officielle ?', correctAnswer: 'getbootstrap.com', hint: 'Get + Bootstrap.', hint_cost: 10, difficulty: 'easy', choices: ['getbootstrap.com', 'bootstrap.org', 'css-bootstrap.com'] },
        { ques: 'Quelle version est la plus récente ?', correctAnswer: 'v5', hint: 'Plus de jQuery.', hint_cost: 10, difficulty: 'easy', choices: ['v5', 'v4', 'v3'] },
        { ques: 'Classe pour une image responsive ?', correctAnswer: 'img-fluid', hint: 'Image fluide.', hint_cost: 10, difficulty: 'easy', choices: ['img-fluid', 'img-resp', 'responsive-img'] }
    ],

    // ── BACKEND ──
    python: [
        { ques: 'Comment installer un paquet externe ?', correctAnswer: 'pip install', hint: 'Python Install Package.', hint_cost: 10, difficulty: 'easy', choices: ['pip install', 'npm install', 'python get'] },
        { ques: 'Signification de __init__.py ?', correctAnswer: 'Marque un dossier comme module', hint: 'Initialisation.', hint_cost: 10, difficulty: 'medium', choices: ['Marque un dossier comme module', 'Script de démarrage', 'Fichier de configuration'] },
        { ques: 'Comment lire un fichier proprement ?', correctAnswer: 'with open()', hint: 'Garantit la fermeture du fichier.', hint_cost: 10, difficulty: 'medium', choices: ['with open()', 'f = read()', 'load_file()'] },
        { ques: 'Résultat de 10 // 3 ?', correctAnswer: '3', hint: 'Division entière.', hint_cost: 10, difficulty: 'easy', choices: ['3', '3.33', '1'] },
        { ques: 'Comment ajouter à une liste ?', correctAnswer: 'append()', hint: 'Ajouter à la fin.', hint_cost: 10, difficulty: 'easy', choices: ['append()', 'add()', 'push()'] },
        { ques: 'Qu\'est-ce qu\'un décorateur ?', correctAnswer: 'Fonction modifiant une autre fonction', hint: 'Utilise le symbole @.', hint_cost: 20, difficulty: 'hard', choices: ['Fonction modifiant une autre fonction', 'Un outil de design UI', 'Une classe statique'] },
        { ques: 'Différence entre Tuple et Liste ?', correctAnswer: 'Les Tuples sont immuables', hint: 'On ne peut pas les modifier après création.', hint_cost: 10, difficulty: 'medium', choices: ['Les Tuples sont immuables', 'Les Listes sont plus rapides', 'Aucune différence'] },
        { ques: 'Comment filtrer avec une compréhension ?', correctAnswer: '[x for x in list if ...]', hint: 'One-liner.', hint_cost: 15, difficulty: 'medium', choices: ['[x for x in list if ...]', 'filter(list)', 'list.filter(...)'] },
        { ques: 'Signification de PEP 8 ?', correctAnswer: 'Guide de style Python', hint: 'Python Enhancement Proposal.', hint_cost: 10, difficulty: 'medium', choices: ['Guide de style Python', 'Une version de Python', 'Un framework web'] },
        { ques: 'Comment gérer les erreurs ?', correctAnswer: 'try...except', hint: 'Essayer... sauf.', hint_cost: 10, difficulty: 'easy', choices: ['try...except', 'try...catch', 'check...fail'] }
    ],
    java: [
        { ques: 'Comment comparer deux String ?', correctAnswer: 'str1.equals(str2)', hint: '== compare les références.', hint_cost: 10, difficulty: 'medium', choices: ['str1.equals(str2)', 'str1 == str2', 'compare(str1, str2)'] },
        { ques: 'Signification de JVM ?', correctAnswer: 'Java Virtual Machine', hint: 'La machine qui exécute le bytecode.', hint_cost: 10, difficulty: 'easy', choices: ['Java Virtual Machine', 'Java Visual Mode', 'Just Virtual Memory'] },
        { ques: 'Une interface peut-elle être instanciée ?', correctAnswer: 'Non', hint: 'C\'est un contrat.', hint_cost: 10, difficulty: 'easy', choices: ['Non', 'Oui', 'Seulement si elle est vide'] },
        { ques: 'Mot-clé pour une classe qui hérite d\'une autre ?', correctAnswer: 'extends', hint: 'Étendre.', hint_cost: 10, difficulty: 'easy', choices: ['extends', 'implements', 'inherits'] },
        { ques: 'Comment déclarer une constante ?', correctAnswer: 'final', hint: 'La dernière valeur.', hint_cost: 10, difficulty: 'medium', choices: ['final', 'static', 'const'] },
        { ques: 'Différence entre abstract et interface ?', correctAnswer: 'Abstract peut avoir des constructeurs', hint: 'L\'interface est plus "pure".', hint_cost: 15, difficulty: 'medium', choices: ['Abstract peut avoir des constructeurs', 'Aucune', 'L\'interface est plus rapide'] },
        { ques: 'Type de retour d\'un constructeur ?', correctAnswer: 'Aucun', hint: 'Même pas void.', hint_cost: 10, difficulty: 'medium', choices: ['Aucun', 'void', 'Le type de la classe'] },
        { ques: 'Collection qui n\'accepte pas de doublons ?', correctAnswer: 'Set', hint: 'Ensemble.', hint_cost: 10, difficulty: 'medium', choices: ['Set', 'List', 'Map'] },
        { ques: 'Comment lever une exception manuellement ?', correctAnswer: 'throw', hint: 'Lancer.', hint_cost: 10, difficulty: 'medium', choices: ['throw', 'throws', 'raises'] },
        { ques: 'Signification de JDK ?', correctAnswer: 'Java Development Kit', hint: 'Kit de développement.', hint_cost: 10, difficulty: 'easy', choices: ['Java Development Kit', 'Java Deploy Key', 'Java Data Kernel'] }
    ],
    nodejs: [
        { ques: 'Comment lire les arguments de la console ?', correctAnswer: 'process.argv', hint: 'Processus + arguments.', hint_cost: 10, difficulty: 'medium', choices: ['process.argv', 'console.args', 'input.read()'] },
        { ques: 'Que fait le middleware body-parser ?', correctAnswer: 'Analyse le corps de la requête JSON', hint: 'Parse le body.', hint_cost: 10, difficulty: 'medium', choices: ['Analyse le corps de la requête JSON', 'Analyse l\'URL', 'Gère les cookies'] },
        { ques: 'Qu\'est-ce que l\'Event Loop ?', correctAnswer: 'Mécanisme gérant l\'asynchronisme', hint: 'Cœur de Node.js.', hint_cost: 20, difficulty: 'hard', choices: ['Mécanisme gérant l\'asynchronisme', 'Une boucle infinie de crash', 'Le moteur V8'] },
        { ques: 'Comment exporter une fonction ?', correctAnswer: 'module.exports', hint: 'Module + exportations.', hint_cost: 10, difficulty: 'easy', choices: ['module.exports', 'export default', 'this.export'] },
        { ques: 'Gère les versions des paquets ?', correctAnswer: 'package.json', hint: 'Fichier racine JSON.', hint_cost: 10, difficulty: 'easy', choices: ['package.json', 'node_modules', 'npm.config'] },
        { ques: 'Lancer un script spécifié dans package.json ?', correctAnswer: 'npm run script-name', hint: 'NPM + courir.', hint_cost: 10, difficulty: 'easy', choices: ['npm run script-name', 'node script-name', 'npm start-only'] },
        { ques: 'Framework web le plus populaire pour Node ?', correctAnswer: 'Express', hint: 'Rapide, minimaliste.', hint_cost: 10, difficulty: 'easy', choices: ['Express', 'Koa', 'NestJS'] },
        { ques: 'Comment arrêter le serveur Node ?', correctAnswer: 'process.exit()', hint: 'Sortir.', hint_cost: 10, difficulty: 'medium', choices: ['process.exit()', 'stop()', 'server.close()'] },
        { ques: 'Quel moteur JS Node utilise-t-il ?', correctAnswer: 'V8 (Google Chrome)', hint: 'Moteur performant.', hint_cost: 10, difficulty: 'medium', choices: ['V8 (Google Chrome)', 'SpiderMonkey', 'Chakra'] },
        { ques: 'Fichier pour les variables d\'environnement ?', correctAnswer: '.env', hint: 'Point + env.', hint_cost: 10, difficulty: 'easy', choices: ['.env', 'config.json', 'secrets.js'] }
    ],
    php: [
        { ques: 'Différence entre single et double quotes ?', correctAnswer: 'Double quotes interprètent les variables', hint: '"$var" vs \'$var\'.', hint_cost: 10, difficulty: 'medium', choices: ['Double quotes interprètent les variables', 'Aucune différence', 'Les simples sont interdites'] },
        { ques: 'Comment démarrer une session ?', correctAnswer: 'session_start()', hint: 'Session + démarrer.', hint_cost: 10, difficulty: 'easy', choices: ['session_start()', 'start_session()', 'session_begin()'] },
        { ques: 'Signification de PHP ?', correctAnswer: 'PHP: Hypertext Preprocessor', hint: 'Acronyme récursif.', hint_cost: 10, difficulty: 'easy', choices: ['PHP: Hypertext Preprocessor', 'Personal Home Page', 'Private Hosting Protocol'] },
        { ques: 'Comment inclure un fichier obligatoirement ?', correctAnswer: 'require', hint: 'Crash si absent.', hint_cost: 10, difficulty: 'medium', choices: ['require', 'include', 'import'] },
        { ques: 'Variable superglobale pour les formulaires POST ?', correctAnswer: '$_POST', hint: 'Signe dollar + underscore.', hint_cost: 10, difficulty: 'easy', choices: ['$_POST', '$POST', 'POST_DATA'] },
        { ques: 'Comment fusionner deux tableaux ?', correctAnswer: 'array_merge()', hint: 'Array + merge.', hint_cost: 10, difficulty: 'medium', choices: ['array_merge()', 'join_array()', 'combine()'] },
        { ques: 'Vérifier si une variable est définie ?', correctAnswer: 'isset()', hint: 'Is + Set.', hint_cost: 10, difficulty: 'easy', choices: ['isset()', 'defined()', 'exists()'] },
        { ques: 'Comment détruire une session ?', correctAnswer: 'session_destroy()', hint: 'Signifie détruire.', hint_cost: 10, difficulty: 'medium', choices: ['session_destroy()', 'session_unset()', 'session_kill()'] },
        { ques: 'Opérateur de concaténation de chaînes ?', correctAnswer: '.', hint: 'Un point.', hint_cost: 10, difficulty: 'easy', choices: ['.', '+', '&'] },
        { ques: 'Comment obtenir la longueur d\'une chaîne ?', correctAnswer: 'strlen()', hint: 'String Length.', hint_cost: 10, difficulty: 'medium', choices: ['strlen()', 'count()', 'length()'] }
    ],

    // ── FRAMEWORK ──
    laravel: [
        { ques: 'Signification du pattern MVC ?', correctAnswer: 'Model-View-Controller', hint: 'Modèle - Vue - Contrôleur.', hint_cost: 10, difficulty: 'easy', choices: ['Model-View-Controller', 'Main-Virtual-Code', 'Module-Version-Context'] },
        { ques: 'Comment exécuter les migrations ?', correctAnswer: 'php artisan migrate', hint: 'Artisan + migrate.', hint_cost: 10, difficulty: 'easy', choices: ['php artisan migrate', 'laravel migrate', 'composer db:migrate'] },
        { ques: 'Dossier contenant les routes web ?', correctAnswer: 'routes/web.php', hint: 'Routes + nom du fichier.', hint_cost: 10, difficulty: 'easy', choices: ['routes/web.php', 'app/routes.php', 'config/web.php'] },
        { ques: 'Fonction pour protéger contre CSRF ?', correctAnswer: '@csrf', hint: 'Directive Blade.', hint_cost: 10, difficulty: 'medium', choices: ['@csrf', '{{ csrf() }}', '<csrf>'] },
        { ques: 'Détail d\'une relation One-to-One ?', correctAnswer: '$this->hasOne(...)', hint: 'Has + One.', hint_cost: 15, difficulty: 'medium', choices: ['$this->hasOne(...)', '$this->belongsTo(...)', '$this->link(...)'] },
        { ques: 'Comment obtenir l\'utilisateur connecté ?', correctAnswer: 'auth()->user()', hint: 'Auth + User.', hint_cost: 10, difficulty: 'medium', choices: ['auth()->user()', '$this->user', 'Session::user()'] },
        { ques: 'Signification de Eloquent ?', correctAnswer: 'ORM de Laravel', hint: 'Manipulation fluide de la DB.', hint_cost: 10, difficulty: 'easy', choices: ['ORM de Laravel', 'Un langage CSS', 'Un serveur web'] },
        { ques: 'Comment injecter une variable dans une vue ?', correctAnswer: 'return view(\'name\', compact(\'var\'))', hint: 'Fonction compact ou tableau.', hint_cost: 10, difficulty: 'medium', choices: ['return view(\'name\', compact(\'var\'))', '$view->send(\'var\')', 'render(\'var\')'] },
        { ques: 'C\'est quoi un Middleware ?', correctAnswer: 'Un filtre pour les requêtes HTTP', hint: 'Se place entre la route et le contrôleur.', hint_cost: 15, difficulty: 'medium', choices: ['Un filtre pour les requêtes HTTP', 'Une base de données', 'Une bibliothèque JS'] },
        { ques: 'Quel outil gère les dépendances PHP ?', correctAnswer: 'Composer', hint: 'Indépendant de Laravel mais requis.', hint_cost: 10, difficulty: 'easy', choices: ['Composer', 'NPM', 'Artisan'] }
    ],

    // ── DATABASE ──
    mysql: [
        { ques: 'Comment trier les résultats par date ?', correctAnswer: 'ORDER BY date DESC', hint: 'Order + By.', hint_cost: 10, difficulty: 'easy', choices: ['ORDER BY date DESC', 'SORT BY date', 'GROUP BY date'] },
        { ques: 'Supprimer tous les enregistrements sans supprimer la table ?', correctAnswer: 'TRUNCATE TABLE name', hint: 'Plus rapide que DELETE.', hint_cost: 15, difficulty: 'medium', choices: ['TRUNCATE TABLE name', 'DELETE ALL FROM name', 'DROP TABLE name'] },
        { ques: 'Signification d\'une clé étrangère (FK) ?', correctAnswer: 'Lien entre deux tables', hint: 'Assure l\'intégrité référentielle.', hint_cost: 10, difficulty: 'medium', choices: ['Lien entre deux tables', 'Clé secrète de cryptage', 'Clé primaire unique'] },
        { ques: 'Comment compter le nombre de lignes ?', correctAnswer: 'COUNT(*)', hint: 'Fonction d\'agrégation.', hint_cost: 10, difficulty: 'easy', choices: ['COUNT(*)', 'SUM(*)', 'TOTAL(*)'] },
        { ques: 'Supprimer un champ d\'une table existante ?', correctAnswer: 'ALTER TABLE ... DROP COLUMN', hint: 'Alter + Drop.', hint_cost: 10, difficulty: 'medium', choices: ['ALTER TABLE ... DROP COLUMN', 'UPDATE TABLE ... REMOVE', 'DELETE COLUMN ...'] },
        { ques: 'Vérifier une valeur dans une liste ?', correctAnswer: 'WHERE field IN (1, 2, 3)', hint: 'Utilise le mot IN.', hint_cost: 10, difficulty: 'medium', choices: ['WHERE field IN (1, 2, 3)', 'WHERE field IS (1, 2)', 'WHERE field = ANY(...)'] },
        { ques: 'Lien entre JOIN et ON ?', correctAnswer: 'C\'est la condition de jointure', hint: 'JOIN table ON ...', hint_cost: 10, difficulty: 'medium', choices: ['C\'est la condition de jointure', 'Aucun lien', 'ON est optionnel'] },
        { ques: 'Différence entre CHAR et VARCHAR ?', correctAnswer: 'VARCHAR est de longueur variable', hint: 'Optimise l\'espace.', hint_cost: 15, difficulty: 'medium', choices: ['VARCHAR est de longueur variable', 'CHAR est plus grand', 'Aucune'] },
        { ques: 'Comment mettre à jour une donnée ?', correctAnswer: 'UPDATE table SET ...', hint: 'Mettre à jour.', hint_cost: 10, difficulty: 'easy', choices: ['UPDATE table SET ...', 'INSERT INTO ...', 'MODIFY table'] },
        { ques: 'Récupérer les valeurs uniques ?', correctAnswer: 'DISTINCT', hint: 'Distinctif.', hint_cost: 10, difficulty: 'easy', choices: ['DISTINCT', 'UNIQUE', 'SINGLE'] }
    ],
    mongodb: [
        { ques: 'Comment s\'appelle une ligne dans MongoDB ?', correctAnswer: 'Un Document', hint: 'Pas un tuple, pas une ligne.', hint_cost: 10, difficulty: 'easy', choices: ['Un Document', 'Une Ligne', 'Un Objet'] },
        { ques: 'Comment s\'appelle une table dans MongoDB ?', correctAnswer: 'Une Collection', hint: 'Un ensemble de documents.', hint_cost: 10, difficulty: 'easy', choices: ['Une Collection', 'Une Plateforme', 'Un Bucket'] },
        { ques: 'Lancer MongoDB en local (CLI) ?', correctAnswer: 'mongod', hint: 'Mongo Daemon.', hint_cost: 10, difficulty: 'medium', choices: ['mongod', 'mongo-start', 'run-mongodb'] },
        { ques: 'Comment trier (1 = croissant, -1 = décroissant) ?', correctAnswer: 'sort({ field: 1 })', hint: 'Signifie trier.', hint_cost: 10, difficulty: 'medium', choices: ['sort({ field: 1 })', 'order({ field: 1 })', 'limit(1)'] },
        { ques: 'Que fait "upsert: true" ?', correctAnswer: 'Met à jour ou insère si absent', hint: 'Update + Insert.', hint_cost: 15, difficulty: 'medium', choices: ['Met à jour ou insère si absent', 'Désactive la sécurité', 'Supprime les doublons'] },
        { ques: 'Équivalent MongoDB de SELECT * ?', correctAnswer: 'find({})', hint: 'Trouver.', hint_cost: 10, difficulty: 'easy', choices: ['find({})', 'query()', 'get_all()'] },
        { ques: 'Comment limiter les résultats à 5 ?', correctAnswer: 'limit(5)', hint: 'Limite.', hint_cost: 10, difficulty: 'easy', choices: ['limit(5)', 'top(5)', 'take(5)'] },
        { ques: 'Quel champ est auto-généré (clé primaire) ?', correctAnswer: '_id', hint: 'Indice : commence par un tiret bas.', hint_cost: 10, difficulty: 'easy', choices: ['_id', 'id_main', 'primary_key'] },
        { ques: 'Opérateur pour supérieur à (Greater Than) ?', correctAnswer: '$gt', hint: 'G... T...', hint_cost: 10, difficulty: 'medium', choices: ['$gt', '$st', '$more'] },
        { ques: 'Gère les schémas via code JS ?', correctAnswer: 'Mongoose', hint: 'ODM populaire.', hint_cost: 10, difficulty: 'medium', choices: ['Mongoose', 'Sequelize', 'Prisma'] }
    ]
};


async function seedDB() {
    let connection;
    try {
        console.log('🔌 Connecting to MySQL...');
        connection = await mysql.createConnection({
            host: process.env.DB_HOST || '127.0.0.1',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'mostafa_quizdb'
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

        // ─── 2. Seed Sample Questions ─────────────────
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
                // Insert question (with hint_cost from claudeDB.sql)
                const [qResult] = await connection.query(
                    'INSERT INTO questions (category_id, question_text, correct_answer, hint, hint_cost, difficulty) VALUES (?, ?, ?, ?, ?, ?)',
                    [categoryId, q.ques, q.correctAnswer, q.hint, q.hint_cost || 10, q.difficulty || 'medium']
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

        // ─── 3. Create Admin User ─────────────────────
        console.log('\n👤 Creating admin user...');
        const adminPassword = 'tawba';
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(adminPassword, salt);
        
        await connection.query(`
            INSERT INTO users (username, email, password_hash, role, hint_points)
            VALUES (?, ?, ?, 'admin', 9999)
            ON DUPLICATE KEY UPDATE 
                password_hash = VALUES(password_hash),
                role = 'admin'
        `, ['mostfa', 'mostfa@myquiz.com', passwordHash]);
        console.log('  ✅ Admin user created (username: mostfa, password: tawba)');

        console.log('\n🎉 Seed completed successfully!');
    } catch (error) {
        console.error('❌ Error seeding DB:', error);
    } finally {
        if (connection) await connection.end();
        process.exit();
    }
}

seedDB();
