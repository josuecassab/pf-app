import React from 'react';
import { ScrollView, Text, View } from 'react-native';

const employees = [
  { id: 1, name: 'Alice Johnson', role: 'Dev', department: 'Engineering' },
  { id: 2, name: 'Bob Smith', role: 'Manager', department: 'Sales' },
  { id: 3, name: 'Charlie Brown', role: 'Designer', department: 'Marketing' },
  { id: 4, name: 'David Lee', role: 'Dev', department: 'Engineering' },
];

export default function SimpleTable() {
  return (
    <ScrollView className="flex-1 bg-white p-4">
      <Text className="text-2xl font-bold mb-4 text-slate-800">Employee List</Text>

      {/* Table Container */}
      <View className="border border-slate-200 rounded-lg overflow-hidden">
        
        {/* Table Header */}
        <View className="flex-row bg-slate-100 border-b border-slate-200 p-3">
          <Text className="flex-1 font-semibold text-slate-600">Name</Text>
          <Text className="flex-1 font-semibold text-slate-600">Role</Text>
          <Text className="flex-1 font-semibold text-slate-600">Dept</Text>
        </View>

        {/* Table Rows */}
        {employees.map((item, index) => (
          <View 
            key={item.id} 
            className={`flex-row p-3 ${
              index !== employees.length - 1 ? 'border-b border-slate-200' : ''
            }`}
          >
            <Text className="flex-1 text-slate-700">{item.name}</Text>
            <Text className="flex-1 text-slate-500">{item.role}</Text>
            <Text className="flex-1 text-slate-500">{item.department}</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}