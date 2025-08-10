const express = require('express');
const cors = require('cors');
const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

let expenses = [];

let monthlyIncome = 5000;

app.get('/api/expenses', (req, res) => {
  res.json({ expenses, monthlyIncome });
});

app.put('/api/income', (req, res) => {
  const { income } = req.body;
  monthlyIncome = parseFloat(income);
  res.json({ monthlyIncome });
});

app.post('/api/expenses', (req, res) => {
  const { title, amount, startDate, endDate } = req.body;
  const newExpense = {
    id: Date.now(),
    title,
    amount: parseFloat(amount),
    startDate,
    endDate
  };
  expenses.push(newExpense);
  res.json(newExpense);
});

app.put('/api/expenses/:id', (req, res) => {
  const { id } = req.params;
  const { title, amount, startDate, endDate } = req.body;
  const expenseIndex = expenses.findIndex(exp => exp.id == id);
  
  if (expenseIndex !== -1) {
    expenses[expenseIndex] = {
      id: parseInt(id),
      title,
      amount: parseFloat(amount),
      startDate,
      endDate
    };
    res.json(expenses[expenseIndex]);
  } else {
    res.status(404).json({ error: 'Expense not found' });
  }
});

app.delete('/api/expenses/:id', (req, res) => {
  const { id } = req.params;
  const expenseIndex = expenses.findIndex(exp => exp.id == id);
  
  if (expenseIndex !== -1) {
    expenses.splice(expenseIndex, 1);
    res.json({ message: 'Expense deleted successfully' });
  } else {
    res.status(404).json({ error: 'Expense not found' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});