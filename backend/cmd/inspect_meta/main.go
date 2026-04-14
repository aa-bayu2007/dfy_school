package main

import (
	"backend/config"
	"backend/models"
	"fmt"
)

func main() {
	config.ConnectDatabase()
	db := config.GetDB()

	fmt.Println("--- Days ---")
	var days []models.Day
	db.Find(&days)
	for _, d := range days {
		fmt.Printf("ID: %d, Name: %s\n", d.ID, d.Name)
	}

	fmt.Println("\n--- Time Slots ---")
	var slots []models.TimeSlot
	db.Find(&slots)
	for _, s := range slots {
		fmt.Printf("ID: %d, Slot: %d, %s - %s\n", s.ID, s.SlotNumber, s.StartTime, s.EndTime)
	}

	fmt.Println("\n--- XII PPLG 3 Schedules Today (DayID 2) ---")
	var schedules []models.Schedule
	db.Preload("Subject").Where("class_id = ? AND day_id = ?", 11, 2).Find(&schedules)
	for _, sc := range schedules {
		fmt.Printf("ID: %d, SlotID: %d, Subject: %s\n", sc.ID, sc.TimeSlotID, sc.Subject.Name)
	}
}
