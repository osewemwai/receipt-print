import { faker } from '@faker-js/faker'

export interface Store {
  name: string
  address1: string
  address2: string
  phone: string
}

export interface ReceiptItem {
  id: string
  name: string
  quantity: number
  unitPrice: number
  totalPrice: number
}

export interface Receipt {
  store: Store
  cashierName: string
  receiptNumber: string
  currency: string
  timestamp: string
  items: ReceiptItem[]
  subtotal: number
  taxRate: number
  tax: number
  total: number
  paidAmount: number
  change: number
}

export interface FakeReceiptOptions {
  itemsMin?: number
  itemsMax?: number
  taxRate?: number
  locale?: string
  currency?: string
}

function currencyRound(n: number): number {
  return Math.round(n * 100) / 100
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

export function generateFakeReceipt(options: FakeReceiptOptions = {}): Receipt {
  const {
    itemsMin = 3,
    itemsMax = 8,
    taxRate = 0.07,
    locale = 'en',
    currency = 'USD',
  } = options

  faker.setDefaultRefDate(new Date())
  faker.locale = locale

  const store: Store = {
    name: faker.company.name(),
    address1: faker.location.streetAddress(),
    address2: `${faker.location.city()}, ${faker.location.state({ abbreviated: true })} ${faker.location.zipCode()}`,
    phone: faker.phone.number(),
  }

  const cashierName = faker.person.fullName()
  const receiptNumber = faker.string.alphanumeric({ length: 10, casing: 'upper' })
  const timestamp = new Date().toISOString()

  const itemsCount = randomInt(itemsMin, itemsMax)
  const items: ReceiptItem[] = Array.from({ length: itemsCount }).map(() => {
    const quantity = randomInt(1, 5)
    const unitPrice = currencyRound(faker.number.float({ min: 0.99, max: 49.99, multipleOf: 0.01 }))
    const totalPrice = currencyRound(quantity * unitPrice)
    return {
      id: faker.string.uuid(),
      name: faker.commerce.productName(),
      quantity,
      unitPrice,
      totalPrice,
    }
  })

  const subtotal = currencyRound(items.reduce((sum, i) => sum + i.totalPrice, 0))
  const tax = currencyRound(subtotal * taxRate)
  const total = currencyRound(subtotal + tax)
  const paidAmount = total // assume exact for demo
  const change = currencyRound(paidAmount - total)

  return {
    store,
    cashierName,
    receiptNumber,
    currency,
    timestamp,
    items,
    subtotal,
    taxRate,
    tax,
    total,
    paidAmount,
    change,
  }
}
