import * as admin from "firebase-admin";
import * as _ from "lodash";
import {
  DocumentReference,
  CollectionReference,
  Query,
  FieldValue,
  Timestamp,
  WriteBatch,
} from "firebase-admin/firestore";
import { firestore as fireStoreConfigs } from "../config";
import { User } from "../models";

admin.initializeApp({ credential: admin.credential.cert(fireStoreConfigs) });

const db = admin.firestore();
export default db;

export interface Filter {
  field: string;
  operation:
  | "<"
  | "<="
  | "=="
  | "!="
  | ">="
  | ">"
  | "array-contains"
  | "in"
  | "array-contains-any"
  | "not-in";
  value: any;
}

export type TimestampOperator = "<" | "<=" | "==" | ">=" | ">";
export type TimeMeasurement = "seconds" | "minutes" | "hours" | "days";
export type IndexAction = "create" | "update" | "delete";
export interface Order {
  field: string;
  direction: "desc" | "asc";
}

export type Collection =
  | "menus"
  | "tokens"
  | "wallets"
  | "orders"
  | "users"
  | "logs"
  | "logs/indexing/histories"
  | "dashboards";

export type Document = {
  id: string;
  value: any;
};

/**
 * Create new document
 * @param {Collections} collectionPath collection path
 * @param {string} docId document id
 * @param {object} payload document data
 * @return {Promise} return
 */
export const create = async (
  collectionPath: Collection,
  docId: string | null,
  payload: any
) => {
  let ref: DocumentReference | CollectionReference =
    db.collection(collectionPath);
  if (docId) {
    ref = ref.doc(docId);
  } else {
    ref = ref.doc();
    payload.id = ref.id;
  }

  return ref.set(payload);
};

/**
 * get document
 * @param collectionPath
 * @param docId
 * @returns
 */
export async function get<T>(
  collectionPath: Collection,
  docId: string
): Promise<(T & { id: string }) | null> {
  return db
    .collection(collectionPath)
    .doc(docId)
    .get()
    .then((docSnapshot) => {
      if (docSnapshot && docSnapshot.exists) {
        return { ...(<T>docSnapshot.data()), id: docSnapshot.id };
      } else {
        return null;
      }
    });
}

/**
 * Get list documents of a collection
 * @param {Collections} collectionPath collection path
 * @param {Filter[]} filters The filters
 * @return {Array} result
 */
export const getListDocs = async (
  collectionPath: Collection,
  filters: Filter[] | null = null,
  orders: Order[] | null = null
) => {
  if (filters !== null && filters.length >= 0) {
    let ref: CollectionReference | Query = db.collection(collectionPath);
    for (let i = 0; i < filters.length; i++) {
      ref = ref.where(filters[i].field, filters[i].operation, filters[i].value);
    }
    if (orders !== null && orders.length > 0) {
      for (let i = 0; i < orders.length; i++) {
        ref = ref.orderBy(orders[i].field, orders[i].direction);
      }
    }
    return ref.get().then((docSnapshot) => {
      const result: any[] = [];
      docSnapshot.forEach((doc) => {
        result.push({ ...doc.data(), id: doc.id });
      });
      return result;
    });
  } else {
    return db
      .collection(collectionPath)
      .get()
      .then((docSnapshot) => {
        const result: any[] = [];
        docSnapshot.forEach((doc) => {
          result.push({ ...doc.data(), id: doc.id });
        });
        return result;
      });
  }
};

export const getListDocsWithPaginate = async (
  collectionPath: Collection,
  limit: number,
  filters: Filter[] | null = null,
  orders: Order[] | null = null
) => {
  let query: CollectionReference | Query = db.collection(collectionPath);
  if (filters !== null && filters.length > 0) {
    for (let i = 0; i < filters.length; i++) {
      query = query.where(
        filters[i].field,
        filters[i].operation,
        filters[i].value
      );
    }
  }
  if (orders !== null && orders.length > 0) {
    for (let i = 0; i < orders.length; i++) {
      query = query.orderBy(orders[i].field, orders[i].direction);
    }
  }
  if (limit) {
    query = query.limit(limit);
  }
  return query.get().then((docSnapshot) => {
    const result: any[] = [];
    let lastDoc = null;
    if (!docSnapshot.empty) {
      docSnapshot.forEach((doc) => {
        lastDoc = doc;
        result.push({ ...doc.data(), id: doc.id });
      });
    }
    return {
      result,
      query,
      lastDoc,
    };
  });
};

// eslint-disable-next-line valid-jsdoc
/**
 * Get document
 * @param {Collections} collectionPath collection path
 * @param {string} docId document path
 * @return {object} documentObject
 */
export const getDoc = async (
  collectionPath: Collection,
  docId: string | null = null,
  filters: Filter[] | null = null
) => {
  if (docId) {
    return db
      .collection(collectionPath)
      .doc(docId)
      .get()
      .then((docSnapshot) => {
        if (docSnapshot.exists) {
          return { ...docSnapshot.data(), id: docId };
        } else {
          return null;
        }
      });
  } else {
    if (filters !== null && filters.length >= 0) {
      let ref: CollectionReference | Query = db.collection(collectionPath);
      for (let i = 0; i < filters.length; i++) {
        ref = ref.where(
          filters[i].field,
          filters[i].operation,
          filters[i].value
        );
      }
      return ref
        .limit(1)
        .get()
        .then((docSnapshot) => {
          if (!docSnapshot.empty) {
            const docData = docSnapshot.docs[0].data();
            const id = docSnapshot.docs[0].id;
            return { ...docData, id };
          } else {
            return null;
          }
        });
    }
    return null;
  }
};

// eslint-disable-next-line valid-jsdoc
/**
 * Get document
 * @param {Collections} collectionPath collection path
 * @param {string} docId document path
 * @return {object} documentObject
 */
export async function getDocAndRef<T>(
  collectionPath: Collection,
  docId: string | null = null,
  filters: Filter[] | null = null
): Promise<
  | {
    data: T;
    ref: FirebaseFirestore.DocumentReference<T>;
  }
  | {
    data: null;
    ref: null;
  }
> {
  if (docId) {
    return db
      .collection(collectionPath)
      .doc(docId)
      .get()
      .then((docSnapshot) => {
        if (docSnapshot.exists) {
          return {
            data: <T>{ ...(<T>docSnapshot.data()), id: docId },
            ref: <FirebaseFirestore.DocumentReference<T>>docSnapshot.ref,
          };
        } else {
          return { data: null, ref: null };
        }
      });
  } else {
    if (filters !== null && filters.length >= 0) {
      let ref: any = db.collection(collectionPath);
      for (let i = 0; i < filters.length; i++) {
        ref = ref.where(
          filters[i].field,
          filters[i].operation,
          filters[i].value
        );
      }
      return ref
        .limit(1)
        .get()
        .then((docSnapshot: any) => {
          if (!docSnapshot.empty) {
            const docData = docSnapshot.docs[0].data();
            const id = <string>docSnapshot.docs[0].id;
            return {
              data: { ...(<T>docData), id },
              ref: <FirebaseFirestore.DocumentReference<T>>(
                docSnapshot.docs[0].ref
              ),
            };
          } else {
            return { data: null, ref: null };
          }
        });
    }
    return { data: null, ref: null };
  }
}

// eslint-disable-next-line valid-jsdoc
/**
 * Get document
 * @param {Collections} collectionPath collection path
 * @param {string} docId document path
 * @return {object} documentObject
 */
export async function getDocOrCreateRef(
  collectionPath: Collection,
  docId: string | null = null,
  filters: Filter[] | null = null
) {
  if (docId) {
    return db
      .collection(collectionPath)
      .doc(docId)
      .get()
      .then((docSnapshot) => {
        return {
          data: { ...docSnapshot.data(), id: docId },
          ref: docSnapshot.ref,
        };
      });
  } else {
    if (filters !== null && filters.length >= 0) {
      let ref: CollectionReference | Query = db.collection(collectionPath);
      for (let i = 0; i < filters.length; i++) {
        ref = ref.where(
          filters[i].field,
          filters[i].operation,
          filters[i].value
        );
      }
      return ref
        .limit(1)
        .get()
        .then((docSnapshot) => {
          if (!docSnapshot.empty) {
            const docData = docSnapshot.docs[0].data();
            const id = docSnapshot.docs[0].id;
            return {
              data: { ...docData, id },
              ref: docSnapshot.docs[0].ref,
            };
          } else {
            return { data: null, ref: db.collection(collectionPath).doc() };
          }
        });
    } else {
      return { data: null, ref: db.collection(collectionPath).doc() };
    }
  }
}

/**
 * Update document
 * @param {Collections} collectionPath collection path
 * @param {string} docId document id
 * @param {object} payload document data
 * @return {Promise} result
 */
export async function updateDoc(
  collectionPath: Collection,
  docId: string,
  payload: any
) {
  return db
    .collection(collectionPath)
    .doc(docId)
    .update(payload)
    .then(() => true)
    .catch((error) => {
      return false;
    });
}

export async function createOrUpdateDoc(
  collectionPath: Collection,
  docId: string,
  payload: any
) {
  if (docId) {
    return db
      .collection(collectionPath)
      .doc(docId)
      .set(payload, { merge: true })
      .then(() => true)
      .catch((error) => {
        return false;
      });
  } else {
    return db
      .collection(collectionPath)
      .doc()
      .set(payload, { merge: true })
      .then(() => true)
      .catch((error) => {
        return false;
      });
  }
}

// eslint-disable-next-line valid-jsdoc
/**
 * Delete document
 * @param {Collections} collectionPath collection path
 * @param {string} docId document id
 * @return {Promise} result
 */
export async function deleteDoc(collectionPath: Collection, docId: string) {
  return db
    .collection(collectionPath)
    .doc(docId)
    .delete()
    .then(() => true)
    .catch((error) => {
      return false;
    });
}

// eslint-disable-next-line valid-jsdoc
/**
 * Get document ref
 * @param {Collections} collectionPath collection path
 * @param {string} docId document id
 * @return {firebase.firestore.DocumentReference} docRef
 */
export function getDocRef<T>(
  collectionPath: Collection,
  docId: string | null = null,
  filters: Filter[] | null = null
): FirebaseFirestore.DocumentReference<T> {
  if (docId) {
    return <FirebaseFirestore.DocumentReference<T>>(
      db.collection(collectionPath).doc(docId)
    );
  } else {
    if (filters !== null && filters.length >= 0) {
      let ref: any = db.collection(collectionPath);
      for (let i = 0; i < filters.length; i++) {
        ref = ref.where(
          filters[i].field,
          filters[i].operation,
          filters[i].value
        );
      }
      return <FirebaseFirestore.DocumentReference<T>>ref;
    } else {
      return <FirebaseFirestore.DocumentReference<T>>(
        db.collection(collectionPath).doc()
      );
    }
  }
}

// eslint-disable-next-line valid-jsdoc
/**
 * Check document is exists
 * @param {Collections} collectionPath collection path
 * @param {string} docId document id
 * @return {boolean}
 */
export const isExists = (
  collectionPath: Collection,
  docId: string | null = null,
  filters: Filter[] | null = null
) => {
  if (docId) {
    return db
      .collection(collectionPath)
      .doc(docId)
      .get()
      .then((doc) => {
        return doc.exists;
      });
  } else {
    if (filters !== null && filters.length >= 0) {
      let ref: CollectionReference | Query = db.collection(collectionPath);
      for (let i = 0; i < filters.length; i++) {
        ref = ref.where(
          filters[i].field,
          filters[i].operation,
          filters[i].value
        );
      }
      return ref
        .limit(1)
        .get()
        .then((doc) => !doc.empty);
    } else {
      return db
        .collection(collectionPath)
        .limit(1)
        .get()
        .then((doc) => !doc.empty);
    }
  }
};

/**
 * Get collection reference
 * @param {Collections} collectionPath collection path
 * @return {firebase.firestore.CollectionReference} ref
 */
export const getCollectionRef = (collectionPath: Collection) => {
  return db.collection(collectionPath);
};

/**
 * Get server timestamp
 * @return {Promise} result
 */
export const getServerTimeStamp = () => {
  return FieldValue.serverTimestamp();
};

export const getTimeStamp = () => {
  return Timestamp;
};

/**
 * Add new elements to an array field
 * @param {Collections} collectionPath collection path
 * @param {string} docId document id
 * @param {string} field field
 * @param {[]} items array elements value
 * @return {Promise} result
 */
export async function addElementsToArray(
  collectionPath: Collection,
  docId: string,
  field: string,
  items: any
) {
  return db
    .collection(collectionPath)
    .doc(docId)
    .update({
      [field]: FieldValue.arrayUnion(...items),
    })
    .then(() => true)
    .catch((error) => {
      return false;
    });
}

/**
 * Remove elements from an array field
 * @param {Collections} collectionPath collction path
 * @param {string} docId document id
 * @param {string} field field
 * @param {[]} items array elements to delete
 * @return {Promise} result
 */
export async function removeElementsFromArray(
  collectionPath: Collection,
  docId: string,
  field: string,
  items: any
) {
  return db
    .collection(collectionPath)
    .doc(docId)
    .update({
      [field]: FieldValue.arrayRemove(...items),
    })
    .then(() => true)
    .catch((error) => {
      return false;
    });
}

/**
 * Increment value of numeric field by step
 * @param {Collections} collectionPath collection path
 * @param {string} docId document id
 * @param {string} field field
 * @param {number} step = 1 step
 * @return {Promise} result
 */
export async function incrementNumericValue(
  collectionPath: Collection,
  docId: string,
  field: string,
  step = 1
) {
  return db
    .collection(collectionPath)
    .doc(docId)
    .update({
      [field]: FieldValue.increment(step),
    })
    .then(() => true)
    .catch((error) => {
      return false;
    });
}

/**
 * Update value of document by update function
 * @param {Collections} collectionPath collecion path
 * @param {string} docId document id
 * @param {Function} updateFn update function
 * @return {Promise} result
 */
export async function runTransaction(
  collectionPath: Collection,
  docId: string,
  updateFn: (data: any) => {}
) {
  const docRef = db.collection(collectionPath).doc(docId);

  return db
    .runTransaction((transaction) => {
      // This code may get re-run multiple times if there are conflicts.
      return transaction.get(docRef).then(function (doc) {
        if (!doc.exists) {
          // eslint-disable-next-line no-throw-literal
          throw "Document does not exist!";
        }
        transaction.update(docRef, updateFn(doc.data()));
      });
    })
    .then(function () { })
    .catch(function (error) { });
}

/**
 * Get batch object maximum 500 operations
 * @return {firebase.firestore.WriteBatch} batch
 */
export const getBatch = () => {
  return db.batch();
};

/**
 * Commit batch
 * @param {firebase.firestore.WriteBatch} batch batch
 * @return {Promise} result
 */
export const commitBatch = (batch: WriteBatch) => {
  return batch.commit();
};

/**
 *
 // eslint-disable-next-line valid-jsdoc
 * @param {firebase.firestore.Timestamp} timestamp
 * @return {number} number seconds
 */
export const getSecondsToNow = (timestamp: Timestamp) => {
  return (Timestamp.now().toMillis() - timestamp.toMillis()) / 1000;
};

/**
 * get Timestamp now
 * @return {firebase.firestore.Timestamp} now
 */
export const getTimeStampNow = () => {
  return Timestamp.now();
};
/**
 * firebase.firestore.Timestamp
 // eslint-disable-next-line valid-jsdoc
 * @param {firebase.firestore.Timestamp} timestamp
 * @param { "<" | "<=" | "==" | ">=" | ">"} operation The operation
 * @param {"seconds" | "minutes" | "hours" | "days"} measurement
 * @param {number} value
 * @return {boolean} true or false
 */
export const compareFromNow = (
  timestamp: Timestamp,
  operation: TimestampOperator,
  measurement: TimeMeasurement,
  value: number
) => {
  if (!timestamp) {
    return true;
  }
  const fromTime = timestamp.toMillis();
  const nowTime = Timestamp.now().toMillis();
  const diff = nowTime - fromTime;
  let diffInMeasurement = diff;
  switch (measurement) {
    case "seconds":
      diffInMeasurement = diff / 1000;
      break;
    case "minutes":
      diffInMeasurement = diff / 1000 / 60;
      break;
    case "hours":
      diffInMeasurement = diff / 1000 / 60 / 60;
      break;
    case "days":
      diffInMeasurement = diff / 1000 / 60 / 60 / 24;
      break;
    default:
      break;
  }
  switch (operation) {
    case "<":
      return diffInMeasurement < value;
    case "<=":
      return diffInMeasurement <= value;
    case ">":
      return diffInMeasurement > value;
    case ">=":
      return diffInMeasurement >= value;
    case "==":
      return diffInMeasurement === value;
    default:
      break;
  }
  return false;
};

// eslint-disable-next-line valid-jsdoc
/**
 * count documents
 * @param {Collections} collectionPath collection path
 * @param {Filter[]} filters The filters
 * @return {number}
 */
export const countDocs = (
  collectionPath: Collection,
  filters: Filter[] | null = null
) => {
  let ref: CollectionReference | Query = db.collection(collectionPath);
  if (filters) {
    for (let i = 0; i < filters.length; i++) {
      ref = ref.where(filters[i].field, filters[i].operation, filters[i].value);
    }
  }
  return ref.get().then((doc) => doc.size);
};

export const isAdminUser = async (user_id: string): Promise<boolean> => {
  const user = await get("users", user_id);
  if (user) {
    const role = _.get(user, "role", []);
    return _.includes(role, "Xng7oS6W1dabWHKWTjz5");
  }
  return false;
};

export const getUserInfo = async (user_id: string): Promise<User> => {
  const user = await get<User>("users", user_id);
  if (!user) {
    throw Error("user not found");
  }
  return user;
};

export const insertLogIndex = async (
  indexName: string,
  action: IndexAction,
  path: string,
  user_id: string,
  err: Error
): Promise<boolean> => {
  const logData = {
    indexName,
    action,
    path,
    user_id,
    error: err.message,
    date: Timestamp.now(),
  };
  const { data: logIndexing, ref: userMoneyRef } = await getDocAndRef(
    "logs",
    "indexing"
  );
  if (logIndexing === null || userMoneyRef === null) {
    await create("logs", "indexing", {
      count: 1,
      last_updated: Timestamp.now(),
    });
  } else {
    await updateDoc("logs", "indexing", {
      count: _.get(logIndexing, "count", 0) + 1,
      last_updated: Timestamp.now(),
    });
  }
  await create("logs/indexing/histories", null, logData);
  return true;
};

export { admin, db };
