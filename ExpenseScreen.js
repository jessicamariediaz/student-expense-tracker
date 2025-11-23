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



  const loadExpenses = async () => {
    const rows = await db.getAllAsync(
      'SELECT * FROM expenses ORDER BY id DESC;'
    );
    setExpenses(rows);
  };

  useEffect(() => {
    async function setup() {

      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS expenses (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          amount REAL NOT NULL,
          category TEXT NOT NULL,
          note TEXT,
          date TEXT
        );
      `);

      const columns = await db.getAllAsync(`PRAGMA table_info(expenses);`);
      const hasDate = columns.some((col) => col.name === 'date');

      if (!hasDate) {
        await db.execAsync(`ALTER TABLE expenses ADD COLUMN date TEXT;`);
        const todayISO = getTodayISO();
        await db.runAsync(
          `UPDATE expenses SET date = ? WHERE date IS NULL OR date = '';`,
          [todayISO]
        );
      }

      setDateText(getTodayISO());

      await loadExpenses();
    }

    setup();
  }, []);



  const resetForm = () => {
    setAmount('');
    setCategory('');
    setNote('');
    setDateText(getTodayISO());
    setEditingId(null);
  };

  const addExpense = async () => {
    const amountNumber = parseFloat(amount);

    if (isNaN(amountNumber) || amountNumber <= 0) {
      return;
    }

    const trimmedCategory = category.trim();
    const trimmedNote = note.trim();
    const trimmedDate = dateText.trim() || getTodayISO();

    if (!trimmedCategory) {
      return;
    }

    await db.runAsync(
      'INSERT INTO expenses (amount, category, note, date) VALUES (?, ?, ?, ?);',
      [amountNumber, trimmedCategory, trimmedNote || null, trimmedDate]
    );

    resetForm();
    await loadExpenses();
  };

  const updateExpense = async () => {
    if (editingId == null) {
      return;
    }

    const amountNumber = parseFloat(amount);

    if (isNaN(amountNumber) || amountNumber <= 0) {
      return;
    }

    const trimmedCategory = category.trim();
    const trimmedNote = note.trim();
    const trimmedDate = dateText.trim() || getTodayISO();

    if (!trimmedCategory) {
      return;
    }

    await db.runAsync(
      `
      UPDATE expenses
      SET amount = ?, category = ?, note = ?, date = ?
      WHERE id = ?;
      `,
      [amountNumber, trimmedCategory, trimmedNote || null, trimmedDate, editingId]
    );

    resetForm();
    await loadExpenses();
  };

  const deleteExpense = async (id) => {
    await db.runAsync('DELETE FROM expenses WHERE id = ?;', [id]);
    await loadExpenses();
  };

  const startEditing = (item) => {
    setEditingId(item.id);
    setAmount(String(item.amount));
    setCategory(item.category);
    setNote(item.note || '');
    setDateText(item.date || getTodayISO());
  };


  const filteredExpenses = getFilteredExpenses();

  const totalSpending = filteredExpenses.reduce((sum, item) => {
    const n = Number(item.amount);
    if (isNaN(n)) return sum;
    return sum + n;
  }, 0);

  const totalsByCategory = filteredExpenses.reduce((acc, item) => {
    const cat = item.category || 'Uncategorized';
    const n = Number(item.amount);
    if (isNaN(n)) return acc;
    if (!acc[cat]) {
      acc[cat] = 0;
    }
    acc[cat] += n;
    return acc;
  }, {});

  const currentFilterLabel =
    filter === 'ALL'
      ? 'All'
      : filter === 'WEEK'
      ? 'This Week'
      : 'This Month';



  const renderExpense = ({ item }) => (
    <TouchableOpacity
      onPress={() => startEditing(item)}
      style={styles.expenseRow}
    >
      <View style={{ flex: 1 }}>
        <Text style={styles.expenseAmount}>
          ${Number(item.amount).toFixed(2)}
        </Text>
        <Text style={styles.expenseCategory}>{item.category}</Text>
        {item.date ? (
          <Text style={styles.expenseDate}>Date: {item.date}</Text>
        ) : null}
        {item.note ? (
          <Text style={styles.expenseNote}>{item.note}</Text>
        ) : null}
      </View>

      <TouchableOpacity onPress={() => deleteExpense(item.id)}>
        <Text style={styles.delete}>✕</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );

  const FilterButton = ({ label, value }) => (
    <TouchableOpacity
      onPress={() => setFilter(value)}
      style={[
        styles.filterButton,
        filter === value && styles.filterButtonActive,
      ]}
    >
      <Text
        style={[
          styles.filterButtonText,
          filter === value && styles.filterButtonTextActive,
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );

  const handleSubmit = () => {
    if (editingId == null) {
      addExpense();
    } else {
      updateExpense();
    }
  };

  const submitLabel = editingId == null ? 'Add Expense' : 'Save Changes';


    return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.heading}>Student Expense Tracker (Advanced)</Text>

      <View style={styles.filtersRow}>
        <FilterButton label="All" value="ALL" />
        <FilterButton label="This Week" value="WEEK" />
        <FilterButton label="This Month" value="MONTH" />
      </View>


      <View style={styles.totalsCard}>
        <Text style={styles.totalHeading}>
          Total Spending ({currentFilterLabel})
        </Text>
        <Text style={styles.totalAmount}>
          ${totalSpending.toFixed(2)}
        </Text>

        <Text style={[styles.totalHeading, { marginTop: 8 }]}>
          By Category ({currentFilterLabel})
        </Text>
        {Object.keys(totalsByCategory).length === 0 ? (
          <Text style={styles.totalEmpty}>
            No expenses for this filter.
          </Text>
        ) : (
          Object.entries(totalsByCategory).map(([cat, value]) => (
            <View key={cat} style={styles.totalRow}>
              <Text style={styles.totalCategory}>{cat}</Text>
              <Text style={styles.totalCategoryAmount}>
                ${value.toFixed(2)}
              </Text>
            </View>
          ))
        )}
      </View>


      <View style={styles.form}>
        <TextInput
          style={styles.input}
          placeholder="Amount (e.g. 12.50)"
          placeholderTextColor="#9ca3af"
          keyboardType="numeric"
          value={amount}
          onChangeText={setAmount}
        />
        <TextInput
          style={styles.input}
          placeholder="Category (Food, Books, Rent...)"
          placeholderTextColor="#9ca3af"
          value={category}
          onChangeText={setCategory}
        />
        <TextInput
          style={styles.input}
          placeholder="Note (optional)"
          placeholderTextColor="#9ca3af"
          value={note}
          onChangeText={setNote}
        />
        <TextInput
          style={styles.input}
          placeholder="Date (YYYY-MM-DD)"
          placeholderTextColor="#9ca3af"
          value={dateText}
          onChangeText={setDateText}
        />
        <Button title={submitLabel} onPress={handleSubmit} />
        {editingId != null && (
          <View style={{ marginTop: 8 }}>
            <Button title="Cancel Edit" onPress={resetForm} />
          </View>
        )}
      </View>


      <FlatList
        data={filteredExpenses}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderExpense}
        ListEmptyComponent={
          <Text style={styles.empty}>No expenses yet.</Text>
        }
      />

      <Text style={styles.footer}>
        Enter your expenses, filter by date, and track totals. All data is
        saved locally with SQLite.
      </Text>
    </SafeAreaView>
  );
}