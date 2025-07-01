const DB_NAME = "GridDB";
const DB_VERSION = 1;
const CELL_STORE = "cells";
const COL_WIDTH_STORE = "colWidths";
const ROW_HEIGHT_STORE = "rowHeights";

let db;

// Initializes the IndexedDB database and creates object stores if they don't exist.
function initDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = (event) => {
            console.error("Database error:", event.target.error);
            reject("Database error");
        };

        request.onupgradeneeded = (event) => {
            const database = event.target.result;
            if (!database.objectStoreNames.contains(CELL_STORE)) {
                database.createObjectStore(CELL_STORE, { keyPath: "id" }); // id is a "row:col" string
            }
            if (!database.objectStoreNames.contains(COL_WIDTH_STORE)) {
                database.createObjectStore(COL_WIDTH_STORE, { keyPath: "id" }); // id is colIndex int
            }
            if (!database.objectStoreNames.contains(ROW_HEIGHT_STORE)) {
                database.createObjectStore(ROW_HEIGHT_STORE, { keyPath: "id" }); // id is rowIndex int
            }
        };

        request.onsuccess = (event) => {
            db = event.target.result;
            console.log("Database initialized successfully.");
            resolve();
        };
    });
}

// Sets or updates data in a specified object store.
function setData(storeName, data) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([storeName], "readwrite");
        const store = transaction.objectStore(storeName);
        const request = store.put(data);

        request.onsuccess = () => resolve();
        request.onerror = (event) => {
            console.error("Set data error:", event.target.error);
            reject(event.target.error);
        };
    });
}

// Retrieves a single data entry from a specified object store by its ID.
function getData(storeName, id) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([storeName], "readonly");
        const store = transaction.objectStore(storeName);
        const request = store.get(id);

        request.onsuccess = () => resolve(request.result);
        request.onerror = (event) => {
            console.error("Get data error:", event.target.error);
            reject(event.target.error);
        };
    });
}

// Retrieves all data from a specified object store.
function getAllData(storeName) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([storeName], "readonly");
        const store = transaction.objectStore(storeName);
        const request = store.getAll();

        request.onsuccess = () => resolve(request.result);
        request.onerror = (event) => {
            console.error("Get all data error:", event.target.error);
            reject(event.target.error);
        };
    });
}

function getMultipleData(storeName, ids) {
    return new Promise((resolve, reject) => {
        if (!db) {
            return reject("Database not initialized.");
        }
        if (!ids || ids.length === 0) {
            return resolve([]);
        }

        const transaction = db.transaction([storeName], "readonly");
        const store = transaction.objectStore(storeName);
        const results = [];

        transaction.oncomplete = () => {
            resolve(results);
        };
        transaction.onerror = (event) => {
            console.error("Get multiple data error:", event.target.error);
            reject(event.target.error);
        };

        ids.forEach((id) => {
            const request = store.get(id);
            request.onsuccess = () => {
                if (request.result) {
                    results.push(request.result);
                }
            };
        });
    });
}

export {
    initDB,
    setData,
    getData,
    getAllData,
    getMultipleData,
    CELL_STORE,
    COL_WIDTH_STORE,
    ROW_HEIGHT_STORE,
};
