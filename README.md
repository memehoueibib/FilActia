# **FilActia**

## **Description**
**FilActia** est une application mobile de réseau social professionnel inspirée de LinkedIn, développée avec **React Native (Expo)** pour le frontend et **NestJS** pour le backend. L'objectif principal est de permettre aux utilisateurs de :
- Créer et gérer un **profil professionnel**.
- Partager des publications sur un **fil d'actualité** interactif.
- Commenter et interagir avec d'autres utilisateurs.
- Utiliser des fonctionnalités modernes comme l'authentification sécurisée (JWT) et le mode hors ligne.

---

## **Fonctionnalités principales**
- **Authentification sécurisée** :
  - Inscription et connexion via JWT.
- **Gestion de profil** :
  - Modification des informations personnelles (bio, photo de profil, etc.).
- **Fil d'actualité** :
  - CRUD complet (Créer, Lire, Mettre à jour, Supprimer) des publications.
  - Gestion des commentaires associés aux publications.
- **Mode hors ligne** :
  - Actions limitées disponibles hors connexion grâce à AsyncStorage.
- **Expérience utilisateur moderne** :
  - Interface utilisateur stylée avec des animations et transitions.
- **Backend robuste** :
  - Basé sur NestJS, avec une API REST bien structurée et documentée avec Swagger.

---

## **Prérequis**
Avant de commencer, assurez-vous d'avoir les outils suivants installés sur votre machine :
- **Node.js** (version 16 ou supérieure) et **npm**.
- **Expo CLI** pour le frontend.
- **PostgreSQL** pour la base de données backend.
- **Git** pour le contrôle de version.

---

## **Installation**

### **1. Cloner le projet**
Clonez le dépôt Git sur votre machine locale :
```bash
git clone https://github.com/username/FilActia.git
```
Accédez au répertoire du projet :
```bash
cd FilActia
```

---

### **2. Installation du frontend (Expo)**
Accédez au dossier frontend :
```bash
cd frontend
```
Installez les dépendances :
```bash
npm install
```

Démarrez le serveur de développement Expo :
```bash
expo start
```
- Scannez le QR code avec l'application **Expo Go** sur votre téléphone pour voir l'application en temps réel.

---

### **3. Installation du backend (NestJS)**
Accédez au dossier backend :
```bash
cd ../backend
```
Installez les dépendances :
```bash
npm install
```

Créez un fichier `.env` dans le dossier `backend/` et configurez vos variables d'environnement :
```env
DB_HOST=localhost
DB_PORT=5432
DB_USER=your_username
DB_PASSWORD=your_password
DB_NAME=filactia
JWT_SECRET=your_jwt_secret
```

Initialisez la base de données PostgreSQL :
1. Connectez-vous à votre instance PostgreSQL.
2. Créez une base de données :
   ```sql
   CREATE DATABASE filactia;
   ```

Démarrez le backend en mode développement :
```bash
npm run start:dev
```

La documentation Swagger sera disponible sur :
```
http://localhost:3000/api-docs
```

---

### **4. Lancer les deux serveurs**
- **Frontend (Expo)** :
  ```bash
  cd frontend
  expo start
  ```
- **Backend (NestJS)** :
  ```bash
  cd backend
  npm run start:dev
  ```

---

## **Structure du projet**
### **Frontend (Expo)** :
```plaintext
src/
|-- api/               # Appels API vers le backend
|-- components/        # Composants réutilisables
|-- hooks/             # Hooks personnalisés
|-- navigation/        # Navigation avec React Navigation
|-- screens/           # Pages principales de l'application
|-- store/             # Gestion de l'état global
|-- utils/             # Fonctions utilitaires
|-- assets/            # Fichiers statiques (images, icônes)
App.tsx                # Point d'entrée de l'application
```

### **Backend (NestJS)** :
```plaintext
src/
|-- modules/           # Modules backend (auth, posts, users)
|-- common/            # DTO partagés, Guards, Intercepteurs
|-- config/            # Configuration (base de données, JWT)
main.ts                # Point d'entrée de l'application
```

---

## **Commandes utiles**
### **Frontend :**
- **Démarrer Expo :**
  ```bash
  expo start
  ```
- **Installer une dépendance :**
  ```bash
  npm install <package_name>
  ```

### **Backend :**
- **Démarrer NestJS :**
  ```bash
  npm run start:dev
  ```
- **Générer un module :**
  ```bash
  nest generate module <module_name>
  ```
- **Générer un contrôleur :**
  ```bash
  nest generate controller <controller_name>
  ```
- **Générer un service :**
  ```bash
  nest generate service <service_name>
  ```

---

## **Workflow Git**
### **Branches principales :**
- **`main`** : Contient la version stable et prête pour la production.
- **`develop`** : Développement actif.

### **Création de branches :**
Travaillez sur une branche dédiée pour chaque fonctionnalité :
```bash
git checkout -b feature/<feature_name>
```

### **Soumettre des modifications :**
1. Ajouter vos modifications :
   ```bash
   git add .
   ```
2. Commiter les changements :
   ```bash
   git commit -m "Description des modifications"
   ```
3. Pousser la branche vers le dépôt distant :
   ```bash
   git push origin feature/<feature_name>
   ```

---

## **Documentation API**
La documentation de l'API NestJS est disponible sur :
```
http://localhost:3000/api-docs
```

---

## **Installation pour démarrer avec Expo ou NestJS**
Si vous débutez avec Expo ou NestJS, suivez ces étapes pour les installer et configurer :

### **1. Installer Expo**
1. Installez Expo CLI globalement :
   ```bash
   npm install -g expo-cli
   ```
2. Créez un nouveau projet Expo :
   ```bash
   expo init my-new-project
   ```
3. Démarrez le serveur Expo :
   ```bash
   cd my-new-project
   expo start
   ```

### **2. Installer NestJS**
1. Installez le CLI NestJS globalement :
   ```bash
   npm install -g @nestjs/cli
   ```
2. Créez un nouveau projet NestJS :
   ```bash
   nest new my-backend
   ```
3. Démarrez le projet :
   ```bash
   cd my-backend
   npm run start:dev
   ```

---

## **Technologies utilisées**
### **Frontend :**
- React Native (Expo)
- React Navigation
- Zustand/Redux
- Axios
- Tailwind CSS

### **Backend :**
- NestJS
- PostgreSQL
- JWT
- Swagger


