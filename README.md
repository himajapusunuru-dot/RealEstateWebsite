# 🏡 Real Estate Management System (MERN)

A full-stack Real Estate Management System built with the **MERN stack**, **React (Vite)**, and **pure CSS**.  
The platform connects **Admins, Realtors, Owners, and Customers** to manage properties, applications, and contracts in a single centralized system.

---

## 📚 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Roles](#roles)
- [Technology Stack](#technology-stack)
- [System Architecture](#system-architecture)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Backend Setup](#backend-setup)
  - [Frontend Setup](#frontend-setup)
- [Environment Variables](#environment-variables)
- [Scripts](#scripts)

---

## Overview

Traditional real estate processes are still largely offline and fragmented, leading to:
- Inefficient communication between buyers, sellers, and agents  
- Difficulty tracking applications, contracts, and documents  
- Lack of transparency and trust throughout the transaction  

This project provides a **centralized web platform** for:
- Real-time property listing and management  
- Online application submission and review  
- Contract generation and tracking  
- Secure storage of user, property, and contract data  

---

## Features ⭐

- **JWT authentication** with role-based access
- **Admin dashboard** for managing users and overall system
- **Owner module** for adding and managing property listings
- **Realtor dashboard** for handling listings, applications, and contracts
- **Customer dashboard** to browse properties and submit applications
- **Application management** (submit, review, approve/reject)
- **Contract management** with buyer, owner, realtor, and property details
- Fully custom **CSS-based responsive UI**

---

## Roles 👥

- **Admin**
  - Manages users (customers, owners, realtors)
  - Supervises the platform

- **Realtor**
  - Manages assigned properties
  - Reviews customer applications
  - Handles contract generation and updates

- **Owner (Seller)**
  - Creates and manages property listings
  - Monitors applications & contract status

- **Customer (Buyer)**
  - Registers and logs in
  - Browses and filters properties
  - Submits applications for interested properties

---

## Technology Stack 🛠

### Frontend
- React (Vite)
- React Router
- JavaScript (ES6+)
- CSS (no UI framework)

### Backend
- Node.js
- Express.js
- MongoDB with Mongoose
- JSON Web Tokens (JWT)
- Bcrypt

---

## System Architecture 🏗

```text
frontend/  (React + Vite)   →   backend/ (Node + Express REST API)   →   MongoDB
Frontend communicates with backend via Axios / fetch

Backend exposes RESTful endpoints

MongoDB stores users, properties, applications, and contracts

🗄 Database Model (High Level)
Main entities:

Admin: id, name, password

Realtor: realtorid, firstname, lastname, phonenumber, ssnnumber, accountnumber

Owner: ownerid, emailid, ownerpassword, firstname, middlename, lastname, dob, phone, occupation, annualincome, address, ssnnumber

Customer: customerid, emailid, customerpassword, firstname, middlename, lastname, dob, phone, occupation, annualincome, address, ssnnumber

Property: propertyid, propertyname, propertystatus, propertytype, propertybhk, propertyimage, area, price, location, ownerid, ownername, realtorid

Application: fullname, emailaddress, phonenumber, ssn, jobproof, employmentstatus, annualincome, governmentid, currentaddress, permanentaddress, profdoc, bankstatement, propertyid

Contract: contractid, contracttype, contractstatus, dates (contract/start/end/closing), saleprice, depositamount, paymentterms, ownerid, buyerid, realtorid, propertyid, propertyaddress, propertytype, description, loan/ mortgage details, clauses, ownersignature, buyersignature

You can include your ER diagram as:

Project Structure 📁
text

project-root/
├── backend/
│   ├── config/          # DB connection, config helpers
│   ├── controllers/     # Route handlers / business logic
│   ├── middleware/      # Auth, error handling, etc.
│   ├── models/          # Mongoose models (User, Property, Contract, ...)
│   ├── routes/          # Express route definitions
│   ├── node_modules/
│   ├── .env
│   ├── package.json
│   ├── package-lock.json
│   └── server.js        # Express app entry point
│
├── frontend/
│   ├── node_modules/
│   ├── public/
│   ├── src/
│   │   ├── api/         # API helpers / axios instances
│   │   ├── assets/      # Images, icons, etc.
│   │   ├── common/      # Shared utilities/components
│   │   ├── components/
│   │   │   ├── admin/   # Admin-specific components
│   │   │   ├── owner/   # Owner-specific components
│   │   ├── hooks/       # Custom React hooks
│   │   ├── layouts/     # Layout components (e.g. main layout)
│   │   ├── customerDashboard.jsx
│   │   ├── realtorDashboard.jsx
│   │   ├── App.jsx
│   │   ├── index.css
│   │   └── main.jsx     # Vite entry
│   ├── .env
│   ├── index.html
│   ├── package.json
│   └── package-lock.json
│
└── README.md
Getting Started 🚀
Prerequisites
Node.js (LTS recommended)

npm or yarn

MongoDB (local or Atlas)

Backend Setup
bash

cd backend
npm install
Create a .env file in /backend (see Environment Variables).

Start the backend (adjust to match your scripts):

bash

npm run dev
# or
npm start
Backend will typically run on: http://localhost:5000

Frontend Setup
bash

cd frontend
npm install
Create a .env file in /frontend (see below).

Start the Vite dev server:

bash

npm run dev
Frontend will typically run on: http://localhost:5173

Environment Variables 🔑
/backend/.env
env

PORT=5000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
(add any extra values you use, e.g. for mail, cloud storage, etc.)

/frontend/.env
env

VITE_API_URL=http://localhost:5000/api
Scripts 📜
Typical useful scripts (defined in package.json):

Backend package.json
npm run dev – start server in dev mode (e.g. with nodemon)

npm start – start production server

Frontend package.json
npm run dev – start Vite dev server

npm run build – build for production

npm run preview – preview production build
