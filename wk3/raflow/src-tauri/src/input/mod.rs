pub mod injector;
pub mod window;

#[cfg(test)]
mod tests;

pub use injector::{InjectionStrategy, TextInjector};
pub use window::{get_active_window, WindowInfo};
