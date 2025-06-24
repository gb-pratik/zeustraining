// Use code with caution.
const DB_NAME = "GridDB";
const DB_VERSION = 1;
const CELL_STORE = "cells";
const COL_WIDTH_STORE = "colWidths";
const ROW_HEIGHT_STORE = "rowHeights";

/** @type {IDBDatabase} Stores the database connection */
let db;

/**
 * Initializes the IndexedDB database and creates object stores if they don't exist.
 * @returns {Promise<void>} A promise that resolves when the DB is ready.
 */
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
                database.createObjectStore(CELL_STORE, { keyPath: "id" }); // id is "row:col"
            }
            if (!database.objectStoreNames.contains(COL_WIDTH_STORE)) {
                database.createObjectStore(COL_WIDTH_STORE, { keyPath: "id" }); // id is colIndex
            }
            if (!database.objectStoreNames.contains(ROW_HEIGHT_STORE)) {
                database.createObjectStore(ROW_HEIGHT_STORE, { keyPath: "id" }); // id is rowIndex
            }
        };

        request.onsuccess = (event) => {
            db = event.target.result;
            console.log("Database initialized successfully.");
            resolve();
        };
    });
}

/**
 * Sets a value in a given object store.
 * @param {string} storeName - The name of the object store.
 * @param {object} data - The data to store. It must have an 'id' property.
 * @returns {Promise<void>}
 */
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

/**
 * Gets a value from a given object store by its ID.
 * @param {string} storeName - The name of the object store.
 * @param {string|number} id - The ID of the item to retrieve.
 * @returns {Promise<object|undefined>} The retrieved data or undefined if not found.
 */
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

/**
 * Gets all data from a store. Used to load initial column/row sizes.
 * @param {string} storeName - The name of the object store.
 * @returns {Promise<object[]>} An array of all objects in the store.
 */
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

export {
    initDB,
    setData,
    getData,
    getAllData,
    CELL_STORE,
    COL_WIDTH_STORE,
    ROW_HEIGHT_STORE,
};
