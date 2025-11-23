import React, { useEffect, useState } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  TextInput,
  Button,
  FlatList,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';

export default function ExpenseScreen() {
  const db = useSQLiteContext();

  const [expenses, setExpenses] = useState([]);
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [note, setNote] = useState('');
  const [dateText, setDateText] = useState('');
  const [filter, setFilter] = useState('ALL'); // 'ALL' | 'WEEK' | 'MONTH'
  const [editingId, setEditingId] = useState(null); // null = adding, number = editing


  const getTodayISO = () => {
    const today = new Date();
    return today.toISOString().slice(0, 10); // 'YYYY-MM-DD'
  };

  const parseISODate = (value) => {
    if (!value) return null;
    const parts = value.split('-');
    if (parts.length !== 3) return null;
    const [y, m, d] = parts;
    const year = Number(y);
    const month = Number(m) - 1;
    const day = Number(d);
    const date = new Date(year, month, day);
    if (isNaN(date.getTime())) return null;
    return date;
  };

  const isSameWeek = (a, b) => {
    // treat "week" as Sunday–Saturday
    const startOfWeek = (date) => {
      const d = new Date(date);
      const day = d.getDay(); // 0–6 (Sun–Sat)
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() - day);
      return d;
    };
    const sa = startOfWeek(a);
    const sb = startOfWeek(b);
    return sa.getTime() === sb.getTime();
  };

  const getFilteredExpenses = () => {
    if (filter === 'ALL') {
      return expenses;
    }

    const today = new Date();
    return expenses.filter((item) => {
      const d = parseISODate(item.date);
      if (!d) return false;

      if (filter === 'WEEK') {
        return isSameWeek(d, today);
      }

      if (filter === 'MONTH') {
        return (
          d.getFullYear() === today.getFullYear() &&
          d.getMonth() === today.getMonth()
        );
      }

      return true;
    });
  };