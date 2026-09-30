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

  const fetchUsers = useCallback(async () => {
    try {
      const res = await api.get('/users')
      setUsers(res.data.users)
    } catch {
      // ignore
    }
  }, [])

  useEffect(() => { fetchUsers() }, [])
  useEffect(() => { fetchDrop() }, [fetchDrop])

  // ── Socket.IO ─────────────────────────────────────────────

  useEffect(() => {
    if (userId) socket.emit('join', userId)
  }, [userId])

  const handlePaymentUpdate = useCallback(() => {
    fetchDrop()
    fetchUsers()
  }, [fetchDrop, fetchUsers])

  useEffect(() => {
    socket.on('inventory:update', fetchDrop)
    socket.on('hold:update', fetchDrop)
    socket.on('queue:update', fetchDrop)
    socket.on('payment:update', handlePaymentUpdate)
    return () => {
      socket.off('inventory:update', fetchDrop)
      socket.off('hold:update', fetchDrop)
      socket.off('queue:update', fetchDrop)
      socket.off('payment:update', handlePaymentUpdate)
    }
  }, [fetchDrop, handlePaymentUpdate])

  // ── Countdown (display only — backend is authoritative) ───

  useEffect(() => {
    const expiresAt = drop?.userStatus?.activeHold?.expiresAt
    if (!expiresAt) {
      setTimeLeft(null)
      return
    }

    const tick = () => {
      const diff = Math.floor((new Date(expiresAt) - Date.now()) / 1000)
      if (diff <= 0) {
        setTimeLeft(0)
        fetchDrop()
        return
      }
      setTimeLeft(diff)
    }

    tick()
    const timer = setInterval(tick, 1000)
    return () => clearInterval(timer)
  }, [drop?.userStatus?.activeHold?.expiresAt, fetchDrop])

  // ── Actions ───────────────────────────────────────────────

  const selectUser = (id) => {
    setUserId(id)
    localStorage.setItem('userId', id)
    setMsg({ text: '', ok: false })
  }

  const createUser = async (e) => {
    e.preventDefault()
    if (!newName.trim()) return
    try {
      const res = await api.post('/users', { name: newName.trim() })
      setUsers(prev => [res.data.user, ...prev])
      selectUser(res.data.user._id)
      setNewName('')
    } catch (e) {
      setMsg({ text: e.response?.data?.message || 'Error creating user', ok: false })
    }
  }

  const buy = async () => {
    setMsg({ text: '', ok: false })
    try {
      const res = await api.post('/drop/buy', { userId })
      if (res.data.status === 'HELD') {
        setMsg({ text: 'Hold secured! Pay within 5 minutes.', ok: true })
      } else if (res.data.status === 'QUEUED') {
        setMsg({ text: `No stock — added to queue at position #${res.data.queuePosition}.`, ok: true })
      } else {
        setMsg({ text: res.data.message || '', ok: false })
      }
      fetchDrop()
    } catch (e) {
      setMsg({ text: e.response?.data?.message || 'Error', ok: false })
    }
  }

  const pay = async () => {
    setMsg({ text: '', ok: false })
    const holdId = drop?.userStatus?.activeHold?.holdId
    if (!holdId) return
    try {
      await api.post('/payment/pay', { holdId })
      setMsg({ text: 'Payment initiated, processing...', ok: true })
    } catch (e) {
      setMsg({ text: e.response?.data?.message || 'Payment error', ok: false })
    }
  }

  // ── Derived state ─────────────────────────────────────────

  const us = drop?.userStatus
  const hasHold = us?.activeHold?.status === 'HELD'
  const inQueue = us?.queuePosition != null
  const atLimit = us?.purchasedCount >= 2

  // ── Render ────────────────────────────────────────────────

  return (
    <div>
      <h1>SneakDrop</h1>
      <p>Limited stock — 20 pairs only. No more, no less.</p>

      <hr />

      <h2>Inventory</h2>
      {drop ? (
        <div className="inventory-grid">
          <p>Total: {drop.total}</p>
          <p>Available: {drop.available}</p>
          <p>Held: {drop.held}</p>
          <p>Sold: {drop.sold}</p>
          <p>Queue: {drop.queueLength}</p>
        </div>
      ) : (
        <p>Loading...</p>
      )}

      <hr />

      <h2>Select User</h2>
      <form onSubmit={createUser}>
        <input
          value={newName}
          onChange={e => setNewName(e.target.value)}
          placeholder="Enter name..."
        />
        <button type="submit">Create</button>
      </form>

      <ul>
        {users.map(u => (
          <li
            key={u._id}
            className={userId === u._id ? 'selected' : ''}
            onClick={() => selectUser(u._id)}
          >
            {u.name} — bought {u.purchasedCount}/2
          </li>
        ))}
      </ul>

      <hr />

      <h2>Your Status</h2>
      {!userId && <p>No user selected.</p>}

      {userId && us && (
        <div>
          {hasHold && (
            <div>
              <p>Status: HOLD ACTIVE</p>
              <div className="countdown">{fmt(timeLeft)}</div>
              <button className="primary" onClick={pay}>Pay now</button>
            </div>
          )}

          {inQueue && !hasHold && (
            <p>Status: IN QUEUE — position #{us.queuePosition}</p>
          )}

          {atLimit && !hasHold && (
            <p>Status: PURCHASED — you have bought 2/2. Limit reached.</p>
          )}

          {us.purchasedCount > 0 && !atLimit && !hasHold && !inQueue && (
            <p>Status: PURCHASED — {us.purchasedCount}/2 bought. You can buy one more.</p>
          )}

          {!hasHold && !inQueue && us.purchasedCount === 0 && (
            <p>Status: nothing active</p>
          )}
        </div>
      )}

      <hr />

      <button
        className="primary"
        onClick={buy}
        disabled={!userId || hasHold || inQueue || atLimit}
      >
        Buy sneaker
      </button>

      {msg.text && (
        <p className={msg.ok ? 'msg ok' : 'msg'}>{msg.text}</p>
      )}
    </div>
  )
}
