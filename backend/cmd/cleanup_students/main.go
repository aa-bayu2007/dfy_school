package main

import (
	"backend/config"
	"fmt"
)

func main() {
	config.ConnectDatabase()
	db := config.GetDB()

	fmt.Println("🧹 Cleaning up student data...")

	// 1. Get student IDs
	var studentIDs []uint
	db.Table("users").Where("role IN ?", []string{"murid", "ketua_kelas"}).Pluck("id", &studentIDs)

	if len(studentIDs) == 0 {
		fmt.Println("✅ No student records found.")
		return
	}

	// 2. Disable foreign key checks for thorough cleanup
	db.Exec("SET FOREIGN_KEY_CHECKS = 0")

	// 3. Delete related data for these students
	fmt.Printf("Deleting data for %d students...\n", len(studentIDs))
	
	// Delete profiles
	db.Exec("DELETE FROM profiles WHERE user_id IN ?", studentIDs)
	
	// Delete attendance records
	db.Exec("DELETE FROM attendances WHERE user_id IN ?", studentIDs)
	
	// Delete attendance requests
	db.Exec("DELETE FROM attendance_requests WHERE user_id IN ?", studentIDs)
	
	// Delete votes
	db.Exec("DELETE FROM votes WHERE user_id IN ?", studentIDs)
	
	// Delete voting candidates
	db.Exec("DELETE FROM voting_candidates WHERE student_id IN ?", studentIDs)

	// 4. Delete the students themselves
	db.Exec("DELETE FROM users WHERE id IN ?", studentIDs)

	// 5. Re-enable foreign key checks
	db.Exec("SET FOREIGN_KEY_CHECKS = 1")

	fmt.Println("✅ Successfully deleted all student data!")
}
