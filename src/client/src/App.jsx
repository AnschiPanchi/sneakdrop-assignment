import React, { useState, useEffect, useCallback } from 'react'
import axios from 'axios'
import { io } from 'socket.io-client'
import './index.css'

const socket = io('http://localhost:5000')
const api = axios.create({ baseURL: '/api' })

function fmt(seconds) {
  if (seconds == null) return '--:--'
  const m = String(Math.floor(seconds / 60)).padStart(2, '0')
  const s = String(seconds % 60).padStart(2, '0')
  return `${m}:${s}`
}

export default function App() {
  const [users, setUsers] = useState([])
  const [userId, setUserId] = useState(localStorage.getItem('userId') || '')
  const [newName, setNewName] = useState('')
  const [drop, setDrop] = useState(null)
  const [msg, setMsg] = useState({ text: '', ok: false })
  const [timeLeft, setTimeLeft] = useState(null)

  // ── Data fetching ─────────────────────────────────────────

  const fetchDrop = useCallback(async () => {
    try {
      const res = await api.get('/drop', { params: userId ? { userId } : {} })
      setDrop(res.data)
    } catch {
      setMsg({ text: 'Could not load drop status.', ok: false })
    }
  }, [userId])

  const fetchUsers = async () => {
    try {
      const res = await api.get('/users')
      setUsers(res.data.users)
    } catch {
      // ignore
    }
  }

  useEffect(() => { fetchUsers() }, [])
  useEffect(() => { fetchDrop() }, [fetchDrop])

  // ── Socket.IO ─────────────────────────────────────────────

  useEffect(() => {
    if (userId) socket.emit('join', userId)
  }, [userId])

  useEffect(() => {
    socket.on('inventory:update', fetchDrop)
    socket.on('hold:update', fetchDrop)
    socket.on('queue:update', fetchDrop)
    return () => {
      socket.off('inventory:update', fetchDrop)
      socket.off('hold:update', fetchDrop)
      socket.off('queue:update', fetchDrop)
    }

<truncated 5207 bytes>