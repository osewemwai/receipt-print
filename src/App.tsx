import ReceiptForm from './pages/ReceiptForm'

function App(): JSX.Element {
  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">receipt-print</h1>
        <p className="text-gray-600 mb-6">
          Compose a receipt, optionally generate fake data, and preview before printing.
        </p>
        <ReceiptForm />
      </div>
    </div>
  )
}

export default App
