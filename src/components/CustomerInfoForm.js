// src/components/CustomerInfoForm.js
import React from 'react';

const CustomerInfoForm = ({ customerName, customerPhone, onNameChange, onPhoneChange }) => {
  return (
    <div>
      <div className="mb-4">
        <label className="block text-green-100 text-sm font-medium mb-2">
          Nombre del Cliente
        </label>
        <input
          type="text"
          value={customerName}
          onChange={(e) => onNameChange(e.target.value)}
          className="w-full bg-green-700 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-green-400 border border-green-600"
          placeholder="Nombre completo del cliente"
        />
      </div>
      
      <div>
        <label className="block text-green-100 text-sm font-medium mb-2">
          Teléfono del Cliente
        </label>
        <input
          type="tel"
          value={customerPhone}
          onChange={(e) => onPhoneChange(e.target.value)}
          className="w-full bg-green-700 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-green-400 border border-green-600"
          placeholder="300 123 4567"
        />
      </div>
    </div>
  );
};

export default CustomerInfoForm;