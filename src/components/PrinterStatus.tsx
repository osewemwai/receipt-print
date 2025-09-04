import { useEffect, useRef, useState } from 'react'
import { getAgentStatus, getPrinters } from '../lib/printClient'

const POLL_MS = Number(import.meta.env.VITE_AGENT_POLL_MS || 15000)
const ERROR_POLL_MS = Number(import.meta.env.VITE_AGENT_ERROR_POLL_MS || 30000)
const FAIL_THRESHOLD = Number(import.meta.env.VITE_AGENT_FAIL_THRESHOLD || 3)

interface Printer {
  name: string
  status: string
  enabled: boolean
  isDefault: boolean
}

interface PrintersInfo {
  defaultName: string | null
  printers: Printer[]
  error?: string
}

function shallowPrintersEqual(a: PrintersInfo | null, b: PrintersInfo | null): boolean {
  if (!a || !b) return false
  if (a.defaultName !== b.defaultName) return false
  if ((a.printers?.length || 0) !== (b.printers?.length || 0)) return false
  for (let i = 0; i < (a.printers?.length || 0); i++) {
    const pa = a.printers[i]
    const pb = b.printers[i]
    if (!pb || pa.name !== pb.name || pa.enabled !== pb.enabled || pa.isDefault !== pb.isDefault || pa.status !== pb.status) {
      return false
    }
  }
  return true
}

function PrinterStatus(): JSX.Element {
  const [agentOk, setAgentOk] = useState<boolean | null>(null)
  const [printers, setPrinters] = useState<PrintersInfo | null>(null)
  const [failCount, setFailCount] = useState(0)
  const abortRef = useRef<AbortController | null>(null)

  async function checkStatus() {
    if (abortRef.current) abortRef.current.abort()
    abortRef.current = new AbortController()
    const signal = abortRef.current.signal

    try {
      const [statusRes, printersRes] = await Promise.all([
        getAgentStatus(signal),
        getPrinters(signal)
      ])

      if (signal.aborted) return

      setAgentOk(statusRes.ok)
      if (!shallowPrintersEqual(printers, printersRes)) {
        setPrinters(printersRes)
      }
      setFailCount(0)
    } catch (err) {
      if (signal.aborted) return
      console.warn('Agent check failed:', err)
      setFailCount(prev => prev + 1)
      if (failCount >= FAIL_THRESHOLD - 1) {
        setAgentOk(false)
        setPrinters(null)
      }
    }
  }

  useEffect(() => {
    checkStatus()
    const interval = setInterval(checkStatus, agentOk === false ? ERROR_POLL_MS : POLL_MS)
    return () => {
      clearInterval(interval)
      if (abortRef.current) abortRef.current.abort()
    }
  }, [agentOk, failCount])

  if (agentOk === null) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-md p-3">
        <div className="text-sm text-gray-600">Checking print agent...</div>
      </div>
    )
  }

  if (!agentOk) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
        <div className="text-sm text-yellow-800">
          <div className="font-medium">Print Agent Offline</div>
          <div className="mt-1">
            The local print agent is not running. Printing will fall back to the browser dialog.
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-green-50 border border-green-200 rounded-md p-3">
      <div className="text-sm text-green-800">
        <div className="font-medium flex items-center">
          <div className="w-2 h-2 bg-green-400 rounded-full mr-2"></div>
          Print Agent Connected
        </div>
        
        {printers && printers.printers.length > 0 ? (
          <div className="mt-2">
            <div className="text-xs text-green-700 mb-1">Available Printers:</div>
            <div className="space-y-1">
              {printers.printers.map((printer) => (
                <div key={printer.name} className="flex items-center justify-between text-xs">
                  <span className={printer.isDefault ? 'font-medium' : ''}>
                    {printer.name} {printer.isDefault && '(default)'}
                  </span>
                  <span className={`px-2 py-0.5 rounded text-xs ${
                    printer.enabled && printer.status === 'idle' 
                      ? 'bg-green-100 text-green-700' 
                      : 'bg-gray-100 text-gray-600'
                  }`}>
                    {printer.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="mt-1 text-xs text-green-700">No printers found</div>
        )}
      </div>
    </div>
  )
}

export default PrinterStatus
