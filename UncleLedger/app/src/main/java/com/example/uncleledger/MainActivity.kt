package com.example.uncleledger

import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.widget.Toast
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import org.json.JSONArray
import org.json.JSONObject
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

private val Navy = Color(0xFF16233D)
private val Blue = Color(0xFF2859D8)
private val Green = Color(0xFF16804A)
private val Red = Color(0xFFC43D3D)
private val Muted = Color(0xFF6B778C)
private val Back = Color(0xFFF4F6FA)

private data class Entry(
    val id: Long, val credit: Boolean, val amount: Double, val note: String,
    val party: String, val mode: String, val upi: String, val time: Long,
    val settled: Boolean = false
)

class MainActivity : ComponentActivity() {
    private val prefs by lazy { getSharedPreferences("uncle_ledger", MODE_PRIVATE) }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        window.statusBarColor = android.graphics.Color.rgb(244, 246, 250)
        window.navigationBarColor = android.graphics.Color.rgb(244, 246, 250)
        @Suppress("DEPRECATION")
        window.decorView.systemUiVisibility = android.view.View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR or
            android.view.View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR

        setContent {
            MaterialTheme(colorScheme = lightColorScheme(primary = Blue, background = Back, surface = Color.White)) {
                var entries by remember { mutableStateOf(loadEntries()) }
                var showAdd by remember { mutableStateOf(false) }
                var addingCredit by remember { mutableStateOf(true) }

                fun update(newEntries: List<Entry>) {
                    entries = newEntries.sortedByDescending { it.time }
                    saveEntries(entries)
                }

                HomeScreen(
                    entries = entries,
                    onAddCredit = { addingCredit = true; showAdd = true },
                    onAddDebit = { addingCredit = false; showAdd = true },
                    onGPay = { payEntry -> openGPay(this@MainActivity, payEntry) },
                    onReminder = { shareReminder(this@MainActivity, entries) },
                    onSettle = { id -> update(entries.map { if (it.id == id) it.copy(settled = true) else it }) },
                    onDelete = { id -> update(entries.filterNot { it.id == id }) }
                )
                if (showAdd) {
                    AddEntryDialog(
                        credit = addingCredit,
                        onClose = { showAdd = false },
                        onSave = { entry -> update(listOf(entry) + entries); showAdd = false }
                    )
                }
            }
        }
    }

    private fun loadEntries(): List<Entry> = try {
        val arr = JSONArray(prefs.getString("entries", "[]"))
        (0 until arr.length()).map { i ->
            val o = arr.getJSONObject(i)
            Entry(
                id = o.optLong("id", i.toLong()),
                credit = o.optBoolean("credit", false),
                amount = o.optDouble("amount", 0.0),
                note = o.optString("note", ""),
                party = o.optString("party", ""),
                mode = o.optString("mode", "Cash"),
                upi = o.optString("upi", ""),
                time = o.optLong("time", System.currentTimeMillis()),
                settled = o.optBoolean("settled", false)
            )
        }.sortedByDescending { it.time }
    } catch (_: Exception) { emptyList() }

    private fun saveEntries(entries: List<Entry>) {
        val arr = JSONArray()
        entries.forEach { e ->
            arr.put(JSONObject().apply {
                put("id", e.id); put("credit", e.credit); put("amount", e.amount)
                put("note", e.note); put("party", e.party); put("mode", e.mode)
                put("upi", e.upi); put("time", e.time); put("settled", e.settled)
            })
        }
        prefs.edit().putString("entries", arr.toString()).apply()
    }
}

@Composable
private fun HomeScreen(
    entries: List<Entry>,
    onAddCredit: () -> Unit,
    onAddDebit: () -> Unit,
    onGPay: (Entry?) -> Unit,
    onReminder: () -> Unit,
    onSettle: (Long) -> Unit,
    onDelete: (Long) -> Unit
) {
    val balance = entries.sumOf { if (it.credit) it.amount else -it.amount }
    val collect = entries.filter { it.mode == "Baaki" && it.credit && !it.settled }.sumOf { it.amount }
    val pay = entries.filter { it.mode == "Baaki" && !it.credit && !it.settled }.sumOf { it.amount }
    val latestDebit = entries.firstOrNull { !it.credit && it.mode == "Online" }

    Column(
        Modifier.fillMaxSize().background(Back).verticalScroll(rememberScrollState()).padding(18.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Box(Modifier.size(50.dp).background(Blue, RoundedCornerShape(16.dp)), contentAlignment = Alignment.Center) {
                Text("₹", color = Color.White, fontSize = 28.sp, fontWeight = FontWeight.Bold)
            }
            Spacer(Modifier.width(12.dp))
            Column {
                Text("Uncle Ledger", fontSize = 25.sp, fontWeight = FontWeight.Bold, color = Navy)
                Text("Simple money tracker", fontSize = 14.sp, color = Muted)
            }
        }

        Card(shape = RoundedCornerShape(22.dp), colors = CardDefaults.cardColors(containerColor = Navy)) {
            Column(Modifier.fillMaxWidth().padding(22.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                Text("YOUR BALANCE", color = Color(0xFFD7E0F2), fontSize = 13.sp, fontWeight = FontWeight.SemiBold)
                Text(rupees(balance), color = Color.White, fontSize = 34.sp, fontWeight = FontWeight.Bold)
                Text("All credit entries minus debit entries", color = Color(0xFFD7E0F2), fontSize = 12.sp)
            }
        }

        Text("What would you like to do?", color = Navy, fontSize = 17.sp, fontWeight = FontWeight.Bold)
        Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            Button(onClick = onAddCredit, modifier = Modifier.weight(1f).height(62.dp), shape = RoundedCornerShape(16.dp),
                colors = ButtonDefaults.buttonColors(containerColor = Green)) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Text("+ Credit", fontWeight = FontWeight.Bold, fontSize = 18.sp)
                    Text("Money received", fontSize = 11.sp)
                }
            }
            Button(onClick = onAddDebit, modifier = Modifier.weight(1f).height(62.dp), shape = RoundedCornerShape(16.dp),
                colors = ButtonDefaults.buttonColors(containerColor = Red)) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Text("− Debit", fontWeight = FontWeight.Bold, fontSize = 18.sp)
                    Text("Money paid", fontSize = 11.sp)
                }
            }
        }

        Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            OutlinedButton(onClick = { onGPay(latestDebit) }, modifier = Modifier.weight(1f).heightIn(min = 52.dp), shape = RoundedCornerShape(14.dp)) {
                Text("Open GPay", fontWeight = FontWeight.SemiBold)
            }
            OutlinedButton(onClick = onReminder, modifier = Modifier.weight(1f).heightIn(min = 52.dp), shape = RoundedCornerShape(14.dp)) {
                Text("Baaki reminder", fontWeight = FontWeight.SemiBold)
            }
        }

        Card(shape = RoundedCornerShape(18.dp), colors = CardDefaults.cardColors(containerColor = Color.White)) {
            Column(Modifier.fillMaxWidth().padding(17.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Text("BAAKI • Pending", color = Navy, fontSize = 16.sp, fontWeight = FontWeight.Bold)
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                    Column {
                        Text("To collect", color = Muted, fontSize = 13.sp)
                        Text(rupees(collect), color = Green, fontSize = 19.sp, fontWeight = FontWeight.Bold)
                    }
                    Column(horizontalAlignment = Alignment.End) {
                        Text("To pay", color = Muted, fontSize = 13.sp)
                        Text(rupees(pay), color = Red, fontSize = 19.sp, fontWeight = FontWeight.Bold)
                    }
                }
            }
        }

        Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
            Text("Recent transactions", color = Navy, fontSize = 18.sp, fontWeight = FontWeight.Bold)
            Spacer(Modifier.weight(1f))
            Text("${entries.size} entries", color = Muted, fontSize = 12.sp)
        }

        if (entries.isEmpty()) {
            Card(shape = RoundedCornerShape(18.dp), colors = CardDefaults.cardColors(containerColor = Color.White)) {
                Column(Modifier.fillMaxWidth().padding(22.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                    Text("No transactions yet", color = Navy, fontSize = 16.sp, fontWeight = FontWeight.SemiBold)
                    Text("Tap Credit or Debit to add the first entry.", color = Muted, fontSize = 13.sp)
                }
            }
        } else {
            entries.take(35).forEach { entry ->
                EntryCard(entry, onSettle = { onSettle(entry.id) }, onDelete = { onDelete(entry.id) },
                    onPay = { onGPay(entry) })
            }
        }
        Text("Saved on this phone. Payments and messages always need your approval.", color = Muted, fontSize = 12.sp)
    }
}

@Composable
private fun EntryCard(entry: Entry, onSettle: () -> Unit, onDelete: () -> Unit, onPay: () -> Unit) {
    var confirmDelete by remember(entry.id) { mutableStateOf(false) }
    Card(shape = RoundedCornerShape(18.dp), colors = CardDefaults.cardColors(containerColor = Color.White)) {
        Column(Modifier.fillMaxWidth().padding(15.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Row(verticalAlignment = Alignment.Top) {
                Column(Modifier.weight(1f)) {
                    Text(entry.note.ifBlank { if (entry.credit) "Credit" else "Debit" }, fontSize = 16.sp,
                        fontWeight = FontWeight.SemiBold, color = Navy)
                    if (entry.party.isNotBlank()) Text(entry.party, color = Muted, fontSize = 13.sp)
                    Text("${entry.mode} • ${SimpleDateFormat("dd MMM, hh:mm a", Locale.getDefault()).format(Date(entry.time))}",
                        color = Muted, fontSize = 12.sp)
                }
                Text((if (entry.credit) "+" else "−") + rupees(entry.amount),
                    color = if (entry.credit) Green else Red, fontSize = 16.sp, fontWeight = FontWeight.Bold)
            }
            if (entry.mode == "Baaki") {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(if (entry.settled) "Settled" else "Still pending",
                        color = if (entry.settled) Green else Color(0xFF9A6700), fontSize = 12.sp)
                    Spacer(Modifier.weight(1f))
                    if (!entry.settled) TextButton(onClick = onSettle) { Text("Mark settled") }
                }
            }
            if (!entry.credit && entry.mode == "Online" && entry.upi.isNotBlank()) {
                OutlinedButton(onClick = onPay, modifier = Modifier.fillMaxWidth()) { Text("Pay via UPI") }
            }
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.End) {
                TextButton(onClick = { confirmDelete = true }) { Text("Delete", color = Muted) }
            }
        }
    }
    if (confirmDelete) {
        AlertDialog(
            onDismissRequest = { confirmDelete = false },
            title = { Text("Delete this entry?") },
            text = { Text("This cannot be undone.") },
            confirmButton = { TextButton(onClick = { confirmDelete = false; onDelete() }) { Text("Delete", color = Red) } },
            dismissButton = { TextButton(onClick = { confirmDelete = false }) { Text("Cancel") } }
        )
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun AddEntryDialog(credit: Boolean, onClose: () -> Unit, onSave: (Entry) -> Unit) {
    var amount by remember { mutableStateOf("") }
    var note by remember { mutableStateOf("") }
    var party by remember { mutableStateOf("") }
    var upi by remember { mutableStateOf("") }
    var mode by remember { mutableStateOf("Cash") }
    var invalid by remember { mutableStateOf(false) }

    AlertDialog(
        onDismissRequest = onClose,
        title = { Text(if (credit) "Add Credit" else "Add Debit", color = Navy, fontWeight = FontWeight.Bold) },
        text = {
            Column(Modifier.fillMaxWidth().heightIn(max = 520.dp).verticalScroll(rememberScrollState()),
                verticalArrangement = Arrangement.spacedBy(11.dp)) {
                OutlinedTextField(value = amount, onValueChange = { amount = it.filter { c -> c.isDigit() || c == '.' }; invalid = false },
                    modifier = Modifier.fillMaxWidth(), label = { Text("Amount (₹) *") }, singleLine = true,
                    isError = invalid, supportingText = if (invalid) ({ Text("Enter an amount greater than zero.") }) else null,
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal))
                OutlinedTextField(value = note, onValueChange = { note = it }, modifier = Modifier.fillMaxWidth(),
                    label = { Text("Purpose / note") }, singleLine = true)
                OutlinedTextField(value = party, onValueChange = { party = it }, modifier = Modifier.fillMaxWidth(),
                    label = { Text("Person or shop (optional)") }, singleLine = true)
                Text("Payment type", color = Navy, fontWeight = FontWeight.SemiBold)
                Row(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                    listOf("Cash", "Online", "Baaki").forEach { choice ->
                        FilterChip(selected = mode == choice, onClick = { mode = choice }, label = { Text(choice) })
                    }
                }
                if (mode == "Online") {
                    OutlinedTextField(value = upi, onValueChange = { upi = it.trim() }, modifier = Modifier.fillMaxWidth(),
                        label = { Text("Payee UPI ID (optional)") }, singleLine = true)
                    Text("UPI details can be prefilled in a supported app. You must approve the payment.", color = Muted, fontSize = 12.sp)
                }
            }
        },
        confirmButton = {
            Button(onClick = {
                val parsed = amount.toDoubleOrNull()
                if (parsed == null || parsed <= 0.0 || !parsed.isFinite()) { invalid = true; return@Button }
                val now = System.currentTimeMillis()
                onSave(Entry(now, credit, parsed, note.trim(), party.trim(), mode, upi.trim(), now))
            }) { Text("Save transaction") }
        },
        dismissButton = { TextButton(onClick = onClose) { Text("Cancel") } }
    )
}

private fun openGPay(context: Context, entry: Entry?) {
    if (entry != null && !entry.credit && entry.upi.isNotBlank()) {
        val uri = Uri.Builder().scheme("upi").authority("pay")
            .appendQueryParameter("pa", entry.upi)
            .appendQueryParameter("pn", entry.party.ifBlank { "Payee" })
            .appendQueryParameter("am", String.format(Locale.US, "%.2f", entry.amount))
            .appendQueryParameter("cu", "INR")
            .appendQueryParameter("tn", entry.note.ifBlank { "Uncle Ledger payment" })
            .build()
        try {
            context.startActivity(Intent(Intent.ACTION_VIEW, uri).setPackage("com.google.android.apps.nbu.paisa.user"))
            return
        } catch (_: Exception) {
            try {
                context.startActivity(Intent.createChooser(Intent(Intent.ACTION_VIEW, uri), "Choose a UPI app"))
                return
            } catch (_: Exception) { }
        }
    }
    val launch = context.packageManager.getLaunchIntentForPackage("com.google.android.apps.nbu.paisa.user")
    if (launch != null) {
        try { context.startActivity(launch); return } catch (_: Exception) { }
    }
    Toast.makeText(context, "Install Google Pay or another UPI app to continue.", Toast.LENGTH_LONG).show()
}

private fun shareReminder(context: Context, entries: List<Entry>) {
    val pending = entries.filter { it.mode == "Baaki" && !it.settled }
    val message = if (pending.isEmpty()) "Uncle Ledger: There are no pending Baaki entries." else buildString {
        append("Baaki reminder from Uncle Ledger\n\n")
        pending.forEach { e ->
            append(if (e.credit) "To collect: " else "To pay: ")
            append(rupees(e.amount))
            if (e.party.isNotBlank()) append(" — ${e.party}")
            if (e.note.isNotBlank()) append(" (${e.note})")
            append("\n")
        }
        append("\nPlease check and confirm the amounts.")
    }
    try {
        context.startActivity(Intent.createChooser(Intent(Intent.ACTION_SEND).apply {
            type = "text/plain"
            putExtra(Intent.EXTRA_TEXT, message)
        }, "Share Baaki reminder"))
    } catch (_: Exception) {
        Toast.makeText(context, "Unable to open sharing apps.", Toast.LENGTH_SHORT).show()
    }
}

private fun rupees(value: Double): String =
    "₹" + String.format(Locale("en", "IN"), "%,.2f", value).replace(".00", "")
