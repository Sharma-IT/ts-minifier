import chalk from 'chalk';

export class Logger {
  private verbose: boolean;

  constructor(verbose = false) {
    this.verbose = verbose;
  }

  info(message: string): void {
    console.log(chalk.blue(`[INFO] ${message}`));
  }

  warn(message: string): void {
    console.warn(chalk.yellow(`[WARN] ${message}`));
  }

  error(message: string): void {
    console.error(chalk.red(`[ERROR] ${message}`));
  }

  debug(message: string): void {
    if (this.verbose) {
      console.log(chalk.gray(`[DEBUG] ${message}`));
    }
  }

  progress(current: number, total: number, message?: string): void {
    const percentage = Math.round((current / total) * 100);
    const progressBar = this.createProgressBar(percentage);
    
    if (this.verbose) {
      console.log(chalk.cyan(`[PROGRESS] ${progressBar} ${percentage}% ${message || ''}`));
    }
  }

  private createProgressBar(percentage: number, width = 30): string {
    const completed = Math.round((width * percentage) / 100);
    const remaining = width - completed;
    
    return `[${'='.repeat(completed)}${' '.repeat(remaining)}]`;
  }
}
