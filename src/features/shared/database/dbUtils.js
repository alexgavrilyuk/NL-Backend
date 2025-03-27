const { getFirestore } = require('../../../core/database');

/**
 * Helper functions for Firestore database operations
 */

/**
 * Create a document with automatic ID
 * @param {string} collection - Collection name
 * @param {object} data - Document data
 * @returns {Promise<object>} Created document reference
 */
const createDocument = async (collection, data) => {
  const db = getFirestore();
  const docRef = await db.collection(collection).add({
    ...data,
    createdAt: new Date(),
    updatedAt: new Date()
  });

  return {
    id: docRef.id,
    ...data
  };
};

/**
 * Create a document with specific ID
 * @param {string} collection - Collection name
 * @param {string} id - Document ID
 * @param {object} data - Document data
 * @returns {Promise<object>} Created document
 */
const createDocumentWithId = async (collection, id, data) => {
  const db = getFirestore();
  await db.collection(collection).doc(id).set({
    ...data,
    createdAt: new Date(),
    updatedAt: new Date()
  });

  return {
    id,
    ...data
  };
};

/**
 * Get a document by ID
 * @param {string} collection - Collection name
 * @param {string} id - Document ID
 * @returns {Promise<object|null>} Document data or null if not found
 */
const getDocument = async (collection, id) => {
  const db = getFirestore();
  const doc = await db.collection(collection).doc(id).get();

  if (!doc.exists) {
    return null;
  }

  return {
    id: doc.id,
    ...doc.data()
  };
};

/**
 * Update a document
 * @param {string} collection - Collection name
 * @param {string} id - Document ID
 * @param {object} data - Document data to update
 * @returns {Promise<object>} Updated document
 */
const updateDocument = async (collection, id, data) => {
  const db = getFirestore();
  await db.collection(collection).doc(id).update({
    ...data,
    updatedAt: new Date()
  });

  // Get the updated document
  return getDocument(collection, id);
};

/**
 * Delete a document
 * @param {string} collection - Collection name
 * @param {string} id - Document ID
 * @returns {Promise<boolean>} True if deleted
 */
const deleteDocument = async (collection, id) => {
  const db = getFirestore();
  await db.collection(collection).doc(id).delete();
  return true;
};

/**
 * Query documents in a collection
 * @param {string} collection - Collection name
 * @param {Array} conditions - Array of condition objects: [{field, operator, value}]
 * @param {object} options - Query options (limit, orderBy, direction)
 * @returns {Promise<Array>} Array of documents
 */
const queryDocuments = async (collection, conditions = [], options = {}) => {
  const db = getFirestore();
  let query = db.collection(collection);

  // Apply conditions
  conditions.forEach(condition => {
    query = query.where(condition.field, condition.operator, condition.value);
  });

  // Apply ordering
  if (options.orderBy) {
    const direction = options.direction || 'asc';
    query = query.orderBy(options.orderBy, direction);
  }

  // Apply limit
  if (options.limit) {
    query = query.limit(options.limit);
  }

  // Execute query
  const snapshot = await query.get();

  // Format results
  const results = [];
  snapshot.forEach(doc => {
    results.push({
      id: doc.id,
      ...doc.data()
    });
  });

  return results;
};

module.exports = {
  createDocument,
  createDocumentWithId,
  getDocument,
  updateDocument,
  deleteDocument,
  queryDocuments
};