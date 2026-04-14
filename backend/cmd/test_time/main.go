package main
import (
	"fmt"
	"time"
)
func main() {
	// April 14, 2026 is Tuesday
	t, _ := time.Parse("2006-01-02", "2026-04-14")
	fmt.Printf("Date: %s, Weekday: %d (%s)\n", t.Format("2006-01-02"), int(t.Weekday()), t.Weekday().String())
}
