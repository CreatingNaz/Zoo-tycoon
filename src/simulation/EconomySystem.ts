import { UPKEEP_COSTS, ADMISSION_TIERS } from '../data/prices';

export interface Transaction {
  time: number;
  amount: number;
  reason: string;
  balance: number;
}

/** Central money manager — single source of truth for zoo finances */
export class EconomySystem {
  private money: number;
  private transactions: Transaction[] = [];

  // Profit tracking
  incomeThisMinute = 0;
  expensesThisMinute = 0;
  private minuteTimer = 0;

  /** Last completed minute's income/expenses for display */
  lastIncomePerMinute = 0;
  lastExpensesPerMinute = 0;

  constructor(startingMoney: number) {
    this.money = startingMoney;
  }

  getMoney(): number {
    return this.money;
  }

  canAfford(amount: number): boolean {
    return this.money >= amount;
  }

  /** Deduct money if affordable. Returns false if insufficient funds. */
  spend(amount: number, reason: string): boolean {
    if (this.money < amount) return false;
    this.money -= amount;
    this.expensesThisMinute += amount;
    this.logTransaction(-amount, reason);
    return true;
  }

  /** Add income */
  earn(amount: number, reason: string): void {
    this.money += amount;
    this.incomeThisMinute += amount;
    this.logTransaction(amount, reason);
  }

  /** Called every 10 seconds — deducts scaled upkeep costs */
  tickUpkeep(animalCount: number, facilityCount: number, upkeepMultiplier = 1.0): void {
    // Scale per-minute rates to 10-second intervals (1/6 of a minute)
    const animalCost = (UPKEEP_COSTS.animalPerMinute * animalCount) / 6;
    const facilityCost = (UPKEEP_COSTS.facilityPerMinute * facilityCount) / 6;
    const total = Math.round((animalCost + facilityCost) * upkeepMultiplier);
    if (total > 0) {
      this.spend(total, 'Upkeep');
    }
  }

  /** Update minute cycle for profit/loss tracking */
  updateMinuteCycle(deltaMs: number): void {
    this.minuteTimer += deltaMs;
    if (this.minuteTimer >= 60000) {
      this.minuteTimer = 0;
      this.lastIncomePerMinute = this.incomeThisMinute;
      this.lastExpensesPerMinute = this.expensesThisMinute;
      this.incomeThisMinute = 0;
      this.expensesThisMinute = 0;
    }
  }

  /** Get admission price based on zoo rating */
  getAdmissionPrice(zooRating: number): number {
    // Find the tier that matches or is just below the rating
    let price = ADMISSION_TIERS[0].price;
    for (const tier of ADMISSION_TIERS) {
      if (zooRating >= tier.rating) {
        price = tier.price;
      }
    }
    return price;
  }

  /** Get net profit per minute (from last completed cycle) */
  getNetProfitPerMinute(): number {
    return this.lastIncomePerMinute - this.lastExpensesPerMinute;
  }

  /** Get recent transactions for display */
  getRecentTransactions(count: number): Transaction[] {
    return this.transactions.slice(-count);
  }

  private logTransaction(amount: number, reason: string): void {
    this.transactions.push({
      time: Date.now(),
      amount,
      reason,
      balance: this.money,
    });
    // Keep only last 50
    if (this.transactions.length > 50) {
      this.transactions.splice(0, this.transactions.length - 50);
    }
  }
}
