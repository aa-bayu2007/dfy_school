package main

import (
	"backend/config"
	"fmt"
)

func main() {
	config.ConnectDatabase()
	db := config.GetDB()

	// Update NIS
	res := db.Exec("UPDATE profiles SET nis = REPLACE(nis, '.0', '') WHERE nis LIKE '%.0'")
	if res.Error != nil {
		fmt.Printf("Error updating NIS: %v\n", res.Error)
	} else {
		fmt.Printf("Updated NIS: %d rows\n", res.RowsAffected)
	}

	// Update NIP
	res2 := db.Exec("UPDATE profiles SET nip = REPLACE(nip, '.0', '') WHERE nip LIKE '%.0'")
	if res2.Error != nil {
		fmt.Printf("Error updating NIP: %v\n", res2.Error)
	} else {
		fmt.Printf("Updated NIP: %d rows\n", res2.RowsAffected)
	}
}
