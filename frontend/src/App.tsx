import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import ScrollToTop from './components/ScrollToTop'
import Home from './pages/Home'
import Pricing from './pages/Pricing'
import Company from './pages/Company'
import HowItWorks from './pages/HowItWorks'
import Privacy from './pages/Privacy'
import Agreement from './pages/Agreement'
import Login from './pages/Login'
import Register from './pages/Register'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'
import Cabinet from './pages/Cabinet'
import Platform from './pages/Platform'
import Integrations from './pages/Integrations'
import Security from './pages/Security'
import ApiPage from './pages/ApiPage'
import UseCases from './pages/UseCases'
import QREntityPage from './pages/QREntityPage'
import QREntityByCodePage from './pages/QREntityByCodePage'

function App() {
  return (
    <>
    <ScrollToTop />
    <Routes>
      <Route path="/scan/entity/:type/by-code/:code" element={<QREntityByCodePage />} />
      <Route path="/scan/entity/:type/:id" element={<QREntityPage />} />
      <Route path="/" element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="pricing" element={<Pricing />} />
        <Route path="platform" element={<Platform />} />
        <Route path="integrations" element={<Integrations />} />
        <Route path="security" element={<Security />} />
        <Route path="api" element={<ApiPage />} />
        <Route path="use-cases" element={<UseCases />} />
        <Route path="company" element={<Company />} />
        <Route path="how-it-works" element={<HowItWorks />} />
        <Route path="privacy" element={<Privacy />} />
        <Route path="agreement" element={<Agreement />} />
        <Route path="login" element={<Login />} />
        <Route path="register" element={<Register />} />
        <Route path="forgot-password" element={<ForgotPassword />} />
        <Route path="reset-password" element={<ResetPassword />} />
        <Route path="cabinet/*" element={<Cabinet />} />
      </Route>
    </Routes>
    </>
  )
}

export default App
