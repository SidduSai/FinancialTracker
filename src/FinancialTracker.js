import React, { useState, useEffect } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend
);

const FinancialTracker = () => {
  const [expenses, setExpenses] = useState([]);
  const [monthlyIncome, setMonthlyIncome] = useState(5000);
  const [formData, setFormData] = useState({
    title: '',
    amount: '',
    startDate: '',
    endDate: ''
  });
  const [editingExpense, setEditingExpense] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [currentViewStart, setCurrentViewStart] = useState(0);
  const [uploadedData, setUploadedData] = useState(null);
  const [scrollLeft, setScrollLeft] = useState(0);

  useEffect(() => {
    fetchExpenses();
  }, []);

  const fetchExpenses = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/expenses');
      const data = await response.json();
      setExpenses(data.expenses || []);
      setMonthlyIncome(data.monthlyIncome || 5000);
    } catch (error) {
      console.error('Error fetching expenses:', error);
      setExpenses([]);
      setMonthlyIncome(5000);
    }
  };

  const updateIncome = async (newIncome) => {
    try {
      const response = await fetch('http://localhost:3001/api/income', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ income: newIncome }),
      });
      if (response.ok) {
        setMonthlyIncome(newIncome);
      }
    } catch (error) {
      console.error('Error updating income:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch('http://localhost:3001/api/expenses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });
      if (response.ok) {
        setFormData({ title: '', amount: '', startDate: '', endDate: '' });
        fetchExpenses();
      }
    } catch (error) {
      console.error('Error adding expense:', error);
    }
  };

  const handleEditExpense = (expense) => {
    setEditingExpense({
      id: expense.id,
      title: expense.title,
      amount: expense.amount.toString(),
      startDate: expense.startDate,
      endDate: expense.endDate
    });
    setShowEditModal(true);
  };

  const handleUpdateExpense = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`http://localhost:3001/api/expenses/${editingExpense.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(editingExpense),
      });
      if (response.ok) {
        setShowEditModal(false);
        setEditingExpense(null);
        fetchExpenses();
      }
    } catch (error) {
      console.error('Error updating expense:', error);
    }
  };

  const handleDeleteExpense = async () => {
    try {
      const response = await fetch(`http://localhost:3001/api/expenses/${editingExpense.id}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        setShowEditModal(false);
        setEditingExpense(null);
        fetchExpenses();
      }
    } catch (error) {
      console.error('Error deleting expense:', error);
    }
  };

  const getTimelineData = () => {
    if (expenses.length === 0) return { startMonth: null, endMonth: null, totalMonths: 0, monthsArray: [] };
    
    const startDates = expenses.map(exp => exp.startDate).sort();
    const endDates = expenses.map(exp => exp.endDate).sort();
    const earliestStart = new Date(startDates[0] + '-01');
    const latestEnd = new Date(endDates[endDates.length - 1] + '-01');
    
    // Add 6-month buffer on both sides
    earliestStart.setMonth(earliestStart.getMonth() - 6);
    latestEnd.setMonth(latestEnd.getMonth() + 6);
    
    const monthsArray = [];
    const current = new Date(earliestStart);
    
    while (current <= latestEnd) {
      monthsArray.push(current.toISOString().slice(0, 7));
      current.setMonth(current.getMonth() + 1);
    }
    
    return { startMonth: monthsArray[0], endMonth: monthsArray[monthsArray.length - 1], totalMonths: monthsArray.length, monthsArray };
  };

  const { startMonth, endMonth, totalMonths, monthsArray } = getTimelineData();

  const getVisibleMonths = () => {
    return monthsArray.slice(currentViewStart, currentViewStart + 12);
  };

  const handleScroll = (e) => {
    const scrollLeft = e.target.scrollLeft;
    setScrollLeft(scrollLeft);
    const scrollWidth = e.target.scrollWidth - e.target.clientWidth;
    const maxViewStart = Math.max(0, monthsArray.length - 12);
    const newViewStart = Math.round((scrollLeft / scrollWidth) * maxViewStart);
    setCurrentViewStart(newViewStart);
    
    // Sync the net income chart scroll
    const netIncomeChart = document.getElementById('net-income-chart');
    if (netIncomeChart && netIncomeChart !== e.target) {
      netIncomeChart.scrollLeft = scrollLeft;
    }
  };

  const handleNetIncomeScroll = (e) => {
    const scrollLeft = e.target.scrollLeft;
    setScrollLeft(scrollLeft);
    const scrollWidth = e.target.scrollWidth - e.target.clientWidth;
    const maxViewStart = Math.max(0, monthsArray.length - 12);
    const newViewStart = Math.round((scrollLeft / scrollWidth) * maxViewStart);
    setCurrentViewStart(newViewStart);
    
    // Sync the expense chart scroll
    const expenseChart = document.getElementById('expense-chart');
    if (expenseChart && expenseChart !== e.target) {
      expenseChart.scrollLeft = scrollLeft;
    }
  };

  const getMonthlyTotals = () => {
    const monthTotals = new Map();
    
    if (monthsArray.length === 0) return monthTotals;
    
    monthsArray.forEach(month => {
      let total = 0;
      expenses.forEach(expense => {
        if (expense.startDate && expense.endDate && 
            month >= expense.startDate && month <= expense.endDate) {
          total += (expense.amount || 0);
        }
      });
      monthTotals.set(month, total);
    });
    
    return monthTotals;
  };

  const monthlyTotals = getMonthlyTotals();

  const getNetIncomeData = () => {
    if (monthsArray.length === 0) {
      return {
        labels: [],
        datasets: [{
          label: 'Net Income',
          data: [],
          borderColor: '#10b981',
          backgroundColor: 'transparent',
        }]
      };
    }
    
    const labels = monthsArray.map(month => {
      const date = new Date(month + '-01');
      return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
    });
    const netIncomes = monthsArray.map(month => 
      monthlyIncome - (monthlyTotals.get(month) || 0)
    );
    
    const hasDebt = netIncomes.some(income => income < 0);
    const lineColor = hasDebt ? '#ef4444' : '#10b981';
    
    return {
      labels,
      datasets: [
        {
          label: 'Net Income',
          data: netIncomes,
          borderColor: lineColor,
          backgroundColor: 'transparent',
          tension: 0.4,
          fill: false,
          pointBackgroundColor: lineColor,
          pointBorderColor: '#ffffff',
          pointBorderWidth: 2,
          pointRadius: 6,
        },
      ],
    };
  };

  const downloadCSV = () => {
    const csvContent = [
      'Title,Amount,Start Date,End Date',
      ...expenses.map(exp => `"${exp.title}",${exp.amount},${exp.startDate},${exp.endDate}`)
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'expenses.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      const csv = e.target.result;
      const lines = csv.split('\n');
      const uploadedExpenses = [];
      
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        
        const [title, amount, startDate, endDate] = line.split(',').map(field => field.replace(/"/g, ''));
        if (title && amount && startDate && endDate) {
          uploadedExpenses.push({ title, amount: parseFloat(amount), startDate, endDate });
        }
      }
      
      setUploadedData(uploadedExpenses);
    };
    reader.readAsText(file);
  };

  const applyUploadedData = async () => {
    if (!uploadedData) return;
    
    if (!window.confirm('This will replace all current expenses with uploaded data. Continue?')) return;
    
    // Clear existing data
    for (const expense of expenses) {
      await fetch(`http://localhost:3001/api/expenses/${expense.id}`, { method: 'DELETE' });
    }
    
    // Add uploaded data
    for (const expense of uploadedData) {
      await fetch('http://localhost:3001/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(expense)
      });
    }
    
    setUploadedData(null);
    fetchExpenses();
  };

  const cleanupData = async () => {
    if (!window.confirm('This will delete all expenses permanently. Continue?')) return;
    
    for (const expense of expenses) {
      await fetch(`http://localhost:3001/api/expenses/${expense.id}`, { method: 'DELETE' });
    }
    
    fetchExpenses();
  };



  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto', backgroundColor: '#e5e5e5', minHeight: '100vh' }}>
      <h1>Financial Tracker</h1>
      
      <form onSubmit={handleSubmit} style={{ marginBottom: '20px', padding: '20px', border: '1px solid #ccc', borderRadius: '4px' }}>
        <h3>Add New Monthly Expense</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '10px', marginBottom: '15px' }}>
          <div>
            <label>Title:</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({...formData, title: e.target.value})}
              required
              style={{ width: '100%', padding: '8px' }}
            />
          </div>
          <div>
            <label>Monthly Amount ($):</label>
            <input
              type="number"
              value={formData.amount}
              onChange={(e) => setFormData({...formData, amount: e.target.value})}
              required
              style={{ width: '100%', padding: '8px' }}
            />
          </div>
          <div>
            <label>Start Month:</label>
            <input
              type="month"
              value={formData.startDate}
              onChange={(e) => setFormData({...formData, startDate: e.target.value})}
              required
              style={{ width: '100%', padding: '8px' }}
            />
          </div>
          <div>
            <label>End Month:</label>
            <input
              type="month"
              value={formData.endDate}
              onChange={(e) => setFormData({...formData, endDate: e.target.value})}
              required
              style={{ width: '100%', padding: '8px' }}
            />
          </div>
        </div>
        <button type="submit" style={{ padding: '8px 16px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
          Add Expense
        </button>
      </form>

      {/* Income Input */}
      <div style={{ marginBottom: '20px', padding: '20px', backgroundColor: 'white', borderRadius: '4px', border: '1px solid #ccc' }}>
        <h4 style={{ margin: '0 0 15px 0' }}>Monthly Income</h4>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '18px', fontWeight: 'bold' }}>$</span>
          <input
            type="number"
            value={monthlyIncome}
            onChange={(e) => updateIncome(parseFloat(e.target.value) || 0)}
            style={{ 
              padding: '10px', 
              fontSize: '18px', 
              fontWeight: 'bold',
              border: '1px solid #ccc', 
              borderRadius: '4px',
              width: '200px',
              backgroundColor: 'white'
            }}
          />
          <span style={{ fontSize: '16px' }}>per month</span>
        </div>
      </div>

      {expenses.length > 0 && (
        <div style={{ marginTop: '30px' }}>
          <h3>Monthly Expense Timeline</h3>
          <div 
            id="expense-chart"
            style={{ 
              border: '1px solid #ccc', 
              borderRadius: '4px', 
              padding: '20px', 
              backgroundColor: '#f9f9f9',
              overflowX: 'auto'
            }}
            onScroll={handleScroll}
          >
            <div style={{ 
              position: 'relative', 
              height: `${expenses.length * 35 + 100}px`,
              width: `${(monthsArray.length / 12) * 100}%`,
              minWidth: '100%'
            }}>
              {/* Month divider lines */}
              {monthsArray.map((month, index) => (
                <div key={`divider-${month}`} style={{
                  position: 'absolute',
                  left: `${(index / monthsArray.length) * 100}%`,
                  top: '0px',
                  width: '1px',
                  height: '100%',
                  backgroundColor: '#ccc',
                  zIndex: 1
                }} />
              ))}
              
              {/* Month headers */}
              {monthsArray.map((month, index) => {
                const monthDate = new Date(month + '-01');
                const monthLabel = monthDate.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
                const total = monthlyTotals.get(month) || 0;
                const balance = monthlyIncome - total;
                
                return (
                  <div key={month} style={{
                    position: 'absolute',
                    left: `${(index / monthsArray.length) * 100}%`,
                    width: `${(1 / monthsArray.length) * 100}%`,
                    top: '0px',
                    height: '60px',
                    borderRight: index < monthsArray.length - 1 ? '1px solid #ddd' : 'none',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: '#fff',
                    zIndex: 2
                  }}>
                    <div style={{ fontSize: '12px', fontWeight: 'bold' }}>
                      {monthLabel}
                    </div>
                    <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#dc2626' }}>
                      ${total.toLocaleString()}
                    </div>
                    <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#16a34a' }}>
                      ${balance.toLocaleString()}
                    </div>
                  </div>
                );
              })}
              
              {/* Expense bars */}
              {expenses.map((expense, index) => {
                const startIndex = monthsArray.indexOf(expense.startDate) + 1;
                const endIndex = monthsArray.indexOf(expense.endDate) + 1;
                const duration = endIndex - startIndex + 1;
                const hue = (index * 137.5) % 360;
                const barWidth = (duration / monthsArray.length) * 100;
                const barLeft = (startIndex / monthsArray.length) * 100;
                const barRight = ((endIndex + 1) / monthsArray.length) * 100;
                const container = document.getElementById('expense-chart');
                const containerWidth = container?.clientWidth || 1000;
                const totalWidth = container?.scrollWidth || containerWidth;
                const scrollPercent = (scrollLeft / totalWidth) * 100;
                const viewportPercent = (containerWidth / totalWidth) * 100;
                
                // Check if expense is currently visible
                const isVisible = barRight > scrollPercent && barLeft < scrollPercent + viewportPercent;
                
                return (
                  <div key={expense.id}>
                    {/* Main expense bar */}
                    <div
                      onClick={() => handleEditExpense(expense)}
                      style={{
                        position: 'absolute',
                        top: `${70 + index * 30}px`,
                        left: `${barLeft}%`,
                        width: `${barWidth}%`,
                        height: '20px',
                        backgroundColor: `hsl(${hue}, 65%, 55%)`,
                        borderRadius: '4px',
                        cursor: 'pointer'
                      }}
                    >
                      {/* Sticky label */}
                      {isVisible && (
                        <div
                          style={{
                            position: 'absolute',
                            top: '0',
                            left: `${Math.max(0, (scrollPercent - barLeft) / barWidth * 100)}%`,
                            height: '20px',
                            backgroundColor: `hsl(${hue}, 65%, 55%)`,
                            color: 'white',
                            fontSize: '10px',
                            fontWeight: 'bold',
                            padding: '0 8px',
                            display: 'flex',
                            alignItems: 'center',
                            borderRadius: '4px',
                            whiteSpace: 'nowrap',
                            zIndex: 10
                          }}
                        >
                          {expense.title} (${expense.amount}/mo)
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          
          {/* Net Income Chart */}
          {monthsArray.length > 0 && (
            <div style={{ marginTop: '20px', padding: '20px', backgroundColor: 'white', border: '1px solid #ccc', borderRadius: '4px' }}>
              <h3 style={{ marginBottom: '10px' }}>Net Income After Expenses</h3>
              <div 
                id="net-income-chart"
                style={{ overflowX: 'auto', position: 'relative' }}
                onScroll={handleNetIncomeScroll}
              >
                {/* Sticky net income value */}
                {monthsArray.length > 0 && (
                  <div style={{
                    position: 'sticky',
                    top: '10px',
                    left: '10px',
                    backgroundColor: 'rgba(255, 255, 255, 0.9)',
                    padding: '8px 12px',
                    borderRadius: '4px',
                    border: '1px solid #ddd',
                    fontSize: '14px',
                    fontWeight: 'bold',
                    zIndex: 10,
                    width: 'fit-content',
                    color: (() => {
                      const container = document.getElementById('net-income-chart');
                      const containerWidth = container?.clientWidth || 1000;
                      const totalWidth = container?.scrollWidth || containerWidth;
                      const currentMonthIndex = Math.floor((scrollLeft / totalWidth) * monthsArray.length);
                      const currentMonth = monthsArray[Math.min(Math.max(currentMonthIndex, 0), monthsArray.length - 1)];
                      const netIncome = monthlyIncome - (monthlyTotals.get(currentMonth) || 0);
                      return netIncome < 0 ? '#ef4444' : '#16a34a';
                    })()
                  }}>
                    Net Income: ${(() => {
                      const container = document.getElementById('net-income-chart');
                      const containerWidth = container?.clientWidth || 1000;
                      const totalWidth = container?.scrollWidth || containerWidth;
                      const currentMonthIndex = Math.floor((scrollLeft / totalWidth) * monthsArray.length);
                      const currentMonth = monthsArray[Math.min(Math.max(currentMonthIndex, 0), monthsArray.length - 1)];
                      const netIncome = monthlyIncome - (monthlyTotals.get(currentMonth) || 0);
                      return netIncome.toLocaleString();
                    })()}
                  </div>
                )}
                <div style={{ width: `${(monthsArray.length / 12) * 100}%`, minWidth: '100%' }}>
                  <Line 
                    data={{
                      labels: monthsArray.map(month => {
                        const date = new Date(month + '-01');
                        return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
                      }),
                      datasets: [{
                        label: 'Net Income',
                        data: monthsArray.map(month => monthlyIncome - (monthlyTotals.get(month) || 0)),
                        borderColor: '#007bff',
                        backgroundColor: 'transparent',
                        tension: 0.4
                      }]
                    }} 
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: { legend: { display: false } },
                      scales: {
                        y: {
                          min: (() => {
                            const data = monthsArray.map(month => monthlyIncome - (monthlyTotals.get(month) || 0));
                            const minValue = Math.min(...data);
                            const maxValue = Math.max(...data);
                            const range = maxValue - minValue;
                            return Math.floor(minValue - range * 0.1);
                          })(),
                          max: (() => {
                            const data = monthsArray.map(month => monthlyIncome - (monthlyTotals.get(month) || 0));
                            const minValue = Math.min(...data);
                            const maxValue = Math.max(...data);
                            const range = maxValue - minValue;
                            return Math.ceil(maxValue + range * 0.1);
                          })(),
                          ticks: { callback: function(value) { return '$' + value.toLocaleString(); } }
                        }
                      }
                    }} 
                    height={200}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && editingExpense && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: '30px',
            borderRadius: '8px',
            width: '500px',
            maxWidth: '90vw'
          }}>
            <h3>Edit Monthly Expense</h3>
            <form onSubmit={handleUpdateExpense}>
              <div style={{ marginBottom: '15px' }}>
                <label>Title:</label>
                <input
                  type="text"
                  value={editingExpense.title}
                  onChange={(e) => setEditingExpense({...editingExpense, title: e.target.value})}
                  required
                  style={{ width: '100%', padding: '8px', marginTop: '4px' }}
                />
              </div>
              <div style={{ marginBottom: '15px' }}>
                <label>Monthly Amount ($):</label>
                <input
                  type="number"
                  value={editingExpense.amount}
                  onChange={(e) => setEditingExpense({...editingExpense, amount: e.target.value})}
                  required
                  style={{ width: '100%', padding: '8px', marginTop: '4px' }}
                />
              </div>
              <div style={{ marginBottom: '15px' }}>
                <label>Start Month:</label>
                <input
                  type="month"
                  value={editingExpense.startDate}
                  onChange={(e) => setEditingExpense({...editingExpense, startDate: e.target.value})}
                  required
                  style={{ width: '100%', padding: '8px', marginTop: '4px' }}
                />
              </div>
              <div style={{ marginBottom: '20px' }}>
                <label>End Month:</label>
                <input
                  type="month"
                  value={editingExpense.endDate}
                  onChange={(e) => setEditingExpense({...editingExpense, endDate: e.target.value})}
                  required
                  style={{ width: '100%', padding: '8px', marginTop: '4px' }}
                />
              </div>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'space-between' }}>
                <button 
                  type="button" 
                  onClick={handleDeleteExpense}
                  style={{ padding: '8px 16px', backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                >
                  Delete
                </button>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button 
                    type="button" 
                    onClick={() => setShowEditModal(false)}
                    style={{ padding: '8px 16px', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    style={{ padding: '8px 16px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                  >
                    Update
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Import/Export Section */}
      <div style={{ marginTop: '30px', padding: '20px', backgroundColor: 'white', borderRadius: '4px', border: '1px solid #ccc' }}>
        <h4>Import/Export Data</h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <div>
            <button 
              type="button" 
              onClick={downloadCSV}
              disabled={expenses.length === 0}
              style={{ padding: '8px 16px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
            >
              Download CSV
            </button>
          </div>
          <div>
            <label style={{ fontSize: '14px', color: '#666', marginBottom: '5px', display: 'block' }}>
              Upload CSV file to import existing expense data:
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <input 
                type="file" 
                accept=".csv" 
                onChange={handleFileUpload}
                style={{ padding: '8px' }}
              />
              {uploadedData && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ color: '#28a745', fontSize: '14px' }}>
                    {uploadedData.length} expenses loaded
                  </span>
                  <button 
                    type="button" 
                    onClick={applyUploadedData}
                    style={{ padding: '8px 16px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                  >
                    Apply
                  </button>
                </div>
              )}
            </div>
          </div>
          <div>
            <button 
              type="button" 
              onClick={cleanupData}
              disabled={expenses.length === 0}
              style={{ padding: '8px 16px', backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
            >
              Clean Up
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FinancialTracker;