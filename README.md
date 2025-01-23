# **FilActia**

## **Description**
**FilActia** est une application mobile de réseau social professionnel inspirée de LinkedIn, développée avec **React Native (Expo)** pour le frontend et **Supabase** pour le backend. L'objectif principal est de permettre aux utilisateurs de :

- Créer et gérer un **profil professionnel**.  
- Partager des publications sur un **fil d'actualité** interactif.  
- Commenter et interagir avec d'autres utilisateurs.  
- Utiliser des fonctionnalités modernes comme l'authentification sécurisée et le mode hors ligne.

**Pourquoi Supabase ?**  
Parce que Supabase fournit une solution complète (base de données PostgreSQL hébergée, authentification, API REST, stockage de fichiers, etc.), simplifiant le développement et l’hébergement d’applications.

---

## **Fonctionnalités principales**
- **Authentification sécurisée** :
  - Inscription et connexion via le système d’auth de Supabase (email, mot de passe, OAuth, etc.).
- **Gestion de profil** :
  - Modification des informations personnelles (bio, photo de profil, etc.).
- **Fil d'actualité** :
  - CRUD (Créer, Lire, Mettre à jour, Supprimer) des publications.
  - Gestion des commentaires associés aux publications.
- **Mode hors ligne** :
  - Actions limitées disponibles hors connexion grâce à AsyncStorage.
- **Expérience utilisateur moderne** :
  - Interface stylée, animations et transitions.
- **Backend sans serveur dédié** :
  - Géré par Supabase (base de données, stockage, authentification, etc.).

---

## **Prérequis**
Avant de commencer, assurez-vous d'avoir :

1. **Node.js** (version 16 ou supérieure) et **npm**  
2. **Expo CLI** installé globalement :  
   ```bash
   npm install -g expo-cli
   ```
3. Un **compte Supabase** et un projet Supabase créé ([https://supabase.com/](https://supabase.com/)).
4. **Git** pour le contrôle de version.

*(Si vous souhaitez faire du développement local avec Supabase CLI, vous pouvez également installer [Supabase CLI](https://supabase.com/docs/guides/cli).)*

---

## **Installation**

### **1. Cloner le projet**
Clonez le dépôt Git sur votre machine locale :

```bash
git clone https://github.com/memehoueibib/FilActia.git
```

Accédez au répertoire du projet :

```bash
cd FilActia
```

---

### **2. Configuration de Supabase**

#### A. Créer un projet dans Supabase
1. Rendez-vous sur [https://app.supabase.com/](https://app.supabase.com/) et connectez-vous.  
2. Créez un **nouveau projet** Supabase.  
3. Notez les informations suivantes, qui vous serviront pour la configuration :  
   - **URL du projet** (par ex. `https://xyzcompany.supabase.co`).  
   - **API Key** (projet → Settings → API → Project API keys).  

*(Optionnel) Si vous souhaitez utiliser le **Supabase CLI** en local et émuler la base, vous pouvez l’installer et lancer `supabase start`. Toutefois, pour la majorité des projets, on se connecte directement à l’instance hébergée.*  

#### B. Configurer la base de données (tables)
- Dans **Supabase → Table Editor**, créez les tables nécessaires (ex. `users`, `posts`, `comments`, etc.) ou importez un schéma SQL.  
- Configurez vos **politiques RLS** (Row-Level Security) pour autoriser ou restreindre les opérations sur chaque table.

#### C. Configurer le fichier `.env` (côté frontend)
Dans le dossier **frontend**, vous pouvez créer un fichier `.env` (ou `.env.local`, selon votre organisation) pour stocker les variables suivantes :

```bash
SUPABASE_URL=https://xyzcompany.supabase.co
SUPABASE_ANON_KEY=xxxxx-xxxxx-xxxxx
```

*(Assurez-vous de ne pas committer vos clés sensibles en clair si le repo est public.)*

---

### **3. Installation du frontend (Expo)**

1. Accédez au dossier **frontend** :

   ```bash
   cd frontend
   ```

2. Installez les dépendances :

   ```bash
   npm install
   ```

3. Assurez-vous que le fichier `.env` (ou la configuration Supabase) soit accessible dans votre code. Par exemple, vous pouvez utiliser la bibliothèque [`react-native-dotenv`](https://github.com/goatandsheep/react-native-dotenv) ou bien configurer [les variables d’environnement Expo](https://docs.expo.dev/guides/environment-variables/).

4. Démarrez l’application Expo :

   ```bash
   expo start
   ```

- Un QR code s’affiche dans votre terminal. Scannez-le avec l’application **Expo Go** sur votre smartphone (ou lancez un émulateur Android/iOS) pour visualiser l’application en temps réel.

---

### **4. Utilisation de Supabase dans le code**

- **Installation du client Supabase** côté frontend (si ce n’est pas déjà fait) :

  ```bash
  npm install @supabase/supabase-js
  ```

- **Initialisation** (exemple de code) :

  ```js
  // src/lib/supabase.js (exemple)
  import { createClient } from '@supabase/supabase-js';

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

  export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  ```

- **Exemples d’opérations** :
  ```js
  // Authentification
  const { user, error } = await supabase.auth.signInWithPassword({
    email: 'test@example.com',
    password: 'password123',
  });

  // Récupération des posts
  const { data: posts, error: errPosts } = await supabase
    .from('posts')
    .select('*');
  ```

*(Adaptez ce code selon votre structure de répertoires.)*

---

### **5. Lancer l’application**

Supabase gère la partie backend. Vous n’avez donc besoin de lancer que le **frontend** :

```bash
cd frontend
expo start
```

- Vous pouvez créer/définir vos requêtes, authentification et storage directement dans Supabase.  

*(Si vous souhaitez un mode hors ligne plus avancé, vous pouvez configurer des techniques de synchronisation locale pour gérer les données quand l’utilisateur est déconnecté.)*

---

## **Structure du projet**

### **Frontend (Expo)** :
```plaintext
src/
|-- api/               # Appels API vers Supabase
|-- components/        # Composants réutilisables
|-- hooks/             # Hooks personnalisés
|-- navigation/        # Navigation avec React Navigation
|-- screens/           # Pages (écrans) de l’application
|-- store/             # Gestion de l'état global (Zustand, Redux, etc.)
|-- utils/             # Fonctions utilitaires
|-- assets/            # Fichiers statiques (images, icônes)
App.tsx                # Point d'entrée de l'application
.env                   # (optionnel) Variables d’environnement
```

---

## **Commandes utiles (Frontend)**

- **Démarrer Expo** :
  ```bash
  expo start
  ```
- **Installer une dépendance** :
  ```bash
  npm install <package_name>
  ```
- **Créer un nouveau projet Expo (si nécessaire)** :
  ```bash
  expo init my-new-project
  ```

---

## **Workflow Git**

- **`main`** : Contient la version stable.  
- **`develop`** : Développement actif.  

**Créer une branche** :
```bash
git checkout -b feature/<feature_name>
```

**Commit et push** :
```bash
git add .
git commit -m "Description des modifications"
git push origin feature/<feature_name>
```

---

## **Documentation de l’API**

Avec Supabase, vous disposez de l’API auto-générée via la [**table REST**] de Supabase (PostgREST) ou vous pouvez consulter les endpoints dans le **Dashboard Supabase** → onglet **API**. 

- La **documentation** se trouve dans votre espace Supabase :  
  ```
  https://yourproject.supabase.co/rest/v1/
  ```
  (Utilisez votre clé anonyme ou un token JWT selon le niveau de sécurité requis.)

---

## **Installation Supabase (optionnelle en local)**

Si vous souhaitez lancer Supabase en local (via Docker) :

1. **Installer Supabase CLI** :
   ```bash
   npm install -g supabase
   ```
2. **Démarrer Supabase** dans votre projet :
   ```bash
   supabase start
   ```
3. Vous pourrez alors accéder à l’interface localement :  
   ```
   http://localhost:54321
   ```
   (ou une autre URL, selon la config.)

*(Dans la plupart des cas, vous utiliserez la version hébergée en ligne.)*

---

## **Technologies utilisées**

### **Frontend :**
- **React Native (Expo)**  
- **React Navigation**  
- **Zustand/Redux**  
- **Axios ou Fetch**  
- **Tailwind CSS (optionnel, via NativeWind)**  

### **Backend (Supabase) :**
- **PostgreSQL** (base hébergée par Supabase)  
- **Authentification** (email/password, OAuth, magie du lien, etc.)  
- **Stockage de fichiers** (Supabase Storage)  
- **API REST automatique** (PostgREST)  
- **Row-Level Security** (RLS)  
- **Edge Functions** (optionnel)

---


Pour toute question, consultez la [documentation Supabase](https://supabase.com/docs) ou [la doc Expo](https://docs.expo.dev/). 

