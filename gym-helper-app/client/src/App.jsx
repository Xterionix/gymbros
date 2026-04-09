import './App.css';
import Navbar from './components/navbar.jsx';
import { Outlet } from "react-router-dom";


function App() {
  return (
    <>
      <Outlet />
      <Navbar />
    </>
  );
}

export default App;
