import React from 'react';
import { Button } from 'antd';
import { HashRouter as Router, Route, Switch, Link, Routes } from 'react-router-dom'
import './App.css';
import Home from './pages/Home';
import Login from './pages/Login';
import Contact from './pages/Contact';

const App = () => {
  return (
    <div className="App">
    <Router >
      <Routes>
        <Route path="/" exact element={<Home/>}/>
        <Route path="/login" exact element={<Login/>}/>
        <Route path="/contact" exact element={<Contact/>}/>
      </Routes>
    </Router>
  </div>
  )
};

export default App;