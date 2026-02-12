package main

import (
	"log"
	"os"
	"os/exec"
)

func main() {
	log.Println("🚀 Starting backend from root...")
	
	// Change to backend directory
	if err := os.Chdir("backend"); err != nil {
		log.Fatalf("❌ Failed to change directory to backend: %v", err)
	}

	// Run go run main.go
	cmd := exec.Command("go", "run", "main.go")
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr
	
	if err := cmd.Run(); err != nil {
		log.Fatalf("❌ Backend crashed: %v", err)
	}
}
