import type { Pedido, Pedidos } from "@/components/dashboard/tipos"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { formatearFechaHora, formatearPesos } from "@/lib/format"

/** Un estado, un estilo: pagado sólido, el resto en gris o contorno. */
const VARIANTE: Record<Pedido["status"], "default" | "secondary" | "outline"> = {
  paid: "default",
  pending: "secondary",
  refunded: "outline",
  failed: "outline",
}

export function RecentOrders({ datos }: { datos: Pedidos | null }) {
  return (
    <Card id="pedidos" className="scroll-mt-20">
      <CardHeader className="border-b">
        <CardTitle>Pedidos recientes</CardTitle>
        <CardDescription>Últimos movimientos registrados</CardDescription>
      </CardHeader>
      <CardContent className="px-0">
        {datos ? (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Pedido</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead className="hidden sm:table-cell">Medio de pago</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {datos.results.map((pedido) => (
                  <TableRow key={pedido.code}>
                    <TableCell className="font-medium tabular-nums">
                      <span className="flex flex-col">
                        {pedido.code}
                        <span className="text-xs font-normal text-muted-foreground">
                          {formatearFechaHora(pedido.placed_at)}
                        </span>
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="flex flex-col">
                        {pedido.customer}
                        <span className="text-xs text-muted-foreground">
                          {pedido.country}
                        </span>
                      </span>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-muted-foreground">
                      {pedido.payment_method_label}
                    </TableCell>
                    <TableCell>
                      <Badge variant={VARIANTE[pedido.status]}>
                        {pedido.status_label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium tabular-nums">
                      {formatearPesos(pedido.total)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="flex flex-col gap-3 px-4">
            {[0, 1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
