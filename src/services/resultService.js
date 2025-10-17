// src/services/resultService.js
import { db } from './firebase';
import { collection, addDoc, getDocs, query, where } from 'firebase/firestore';

export const saveMatchResult = async (matchId, result, date) => {
  try {
    const resultData = {
      matchId,
      result,
      date,
      timestamp: new Date().toISOString()
    };
    
    const docRef = await addDoc(collection(db, 'match_results'), resultData);
    return { success: true, id: docRef.id };
  } catch (error) {
    console.error('Error al guardar resultado:', error);
    return { success: false, error: error.message };
  }
};

export const getMatchResults = async (date) => {
  try {
    const q = query(collection(db, 'match_results'), where('date', '==', date));
    const querySnapshot = await getDocs(q);
    const results = {};
    
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      results[data.matchId] = data.result;
    });
    
    return results;
  } catch (error) {
    console.error('Error al obtener resultados:', error);
    return {};
  }
};