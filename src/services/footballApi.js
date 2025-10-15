// src/services/footballApi.js
const API_BASE_URL = 'https://v3.football.api-sports.io';
const API_KEY = '41e5e8d998b4d59f700b0d22019eb057';

export const getMatchesForToday = async (date) => {
  try {
    const response = await fetch(`${API_BASE_URL}/fixtures?date=${date}`, {
      headers: {
        'x-apisports-key': API_KEY
      }
    });
    const data = await response.json();
    return data.response;
  } catch (error) {
    console.error('Error al obtener partidos:', error);
    return [];
  }
};