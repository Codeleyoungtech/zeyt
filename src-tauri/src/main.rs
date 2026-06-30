// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    let args: Vec<String> = std::env::args().collect();
    if args.iter().any(|a| a == "--version" || a == "-v") {
        println!("Zeyt v{}", env!("CARGO_PKG_VERSION"));
        std::process::exit(0);
    }
    if args.iter().any(|a| a == "--help" || a == "-h") {
        println!("Zeyt v{}", env!("CARGO_PKG_VERSION"));
        println!("A fast, lightweight terminal emulator optimized for agentic workflows.\n");
        println!("Usage:");
        println!("  zeyt [OPTIONS] [PATH]");
        println!("\nOptions:");
        println!("  -v, --version    Print version info and exit");
        println!("  -h, --help       Print this help info and exit");
        println!("\nArguments:");
        println!("  [PATH]           Open Zeyt with the specified directory as the workspace root");
        std::process::exit(0);
    }

    zeyt_lib::run()
}
